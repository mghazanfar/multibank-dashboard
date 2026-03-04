import { createServer } from "node:http";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";
import type { TickMessage } from "./lib/types/market";
import { marketSimulator } from "./lib/market/instance";

interface ClientState {
  subscriptions: Set<string>;
}

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST ?? (dev ? "localhost" : "0.0.0.0");
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname: host, port });
const requestHandler = app.getRequestHandler();

function sendJson(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

app
  .prepare()
  .then(() => {
    const clients = new Map<WebSocket, ClientState>();
    const wsServer = new WebSocketServer({ noServer: true });

    const unsubscribeMarket = marketSimulator.subscribe((tick: TickMessage) => {
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

          if (!symbol || !marketSimulator.isValidTicker(symbol)) {
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

            const snapshot = marketSimulator.getSnapshot(symbol);
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

    const server = createServer((req, res) => {
      if (dev) {
        const headerHost = req.headers.host ?? "";
        const [rawHost, rawPort] = headerHost.split(":");
        const requestPath = req.url ?? "/";

        if (rawHost === "0.0.0.0") {
          const redirectPort = rawPort ? `:${rawPort}` : "";
          res.statusCode = 307;
          res.setHeader("Location", `http://localhost${redirectPort}${requestPath}`);
          res.end();
          return;
        }
      }

      requestHandler(req, res);
    });

    server.on("upgrade", (req, socket, head) => {
      if (req.url !== "/api/ws") {
        socket.destroy();
        return;
      }

      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req);
      });
    });

    server.listen(port, host, () => {
      console.log(`> Ready on http://${host}:${port}`);
    });

    process.on("SIGINT", () => {
      unsubscribeMarket();
      wsServer.close();
      server.close();
      process.exit(0);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
