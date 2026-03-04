import { WebSocket, WebSocketServer } from "ws";
import type { TickMessage } from "./lib/types/market";
import { MarketSimulator } from "./lib/market/market-simulator";

interface ClientState {
  subscriptions: Set<string>;
}

const wsPort = Number(process.env.WS_PORT ?? 3001);
const simulator = new MarketSimulator();
simulator.start();

const clients = new Map<WebSocket, ClientState>();
const wsServer = new WebSocketServer({
  port: wsPort,
  path: "/api/ws",
});

function sendJson(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

const unsubscribeMarket = simulator.subscribe((tick: TickMessage) => {
  clients.forEach((state, ws) => {
    if (state.subscriptions.has(tick.symbol)) {
      sendJson(ws, tick);
    }
  });
});

wsServer.on("connection", (ws) => {
  clients.set(ws, { subscriptions: new Set<string>() });

  sendJson(ws, {
    type: "welcome",
    message: "Connected to realtime feed",
  });

  ws.on("message", (rawMessage) => {
    try {
      const message = JSON.parse(String(rawMessage)) as {
        type?: "subscribe" | "unsubscribe" | "ping";
        symbol?: string;
      };

      const state = clients.get(ws);
      const symbol = message.symbol?.toUpperCase();

      if (!state) {
        return;
      }

      if (message.type === "ping") {
        sendJson(ws, { type: "pong", ts: new Date().toISOString() });
        return;
      }

      if (!symbol || !simulator.isValidTicker(symbol)) {
        sendJson(ws, {
          type: "error",
          message: "Invalid symbol",
        });
        return;
      }

      if (message.type === "subscribe") {
        state.subscriptions.add(symbol);
        sendJson(ws, {
          type: "subscribed",
          symbol,
        });

        const snapshot = simulator.getSnapshot(symbol);
        if (snapshot) {
          sendJson(ws, {
            type: "tick",
            symbol: snapshot.symbol,
            price: snapshot.price,
            change: 0,
            updatedAt: snapshot.updatedAt,
          });
        }
      }

      if (message.type === "unsubscribe") {
        state.subscriptions.delete(symbol);
        sendJson(ws, {
          type: "unsubscribed",
          symbol,
        });
      }
    } catch {
      sendJson(ws, {
        type: "error",
        message: "Malformed message",
      });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

console.log(`> Market WS feed ready on ws://localhost:${wsPort}/api/ws`);

function shutdown() {
  unsubscribeMarket();
  wsServer.close();
  simulator.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
