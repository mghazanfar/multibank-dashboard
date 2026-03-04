# MultiBank Real-Time Trading Dashboard

A fullstack Next.js (App Router) trading dashboard with:

- REST APIs for ticker discovery and mocked historical data
- WebSocket streaming for real-time price ticks
- React Query caching for API reads
- Context-based mocked auth (no Redux)
- Responsive live dashboard with charting and threshold alerts
- Unit tests for backend market simulation logic
- Docker containerization

## Architecture

### Backend (inside Next.js runtime)

- `GET /api/tickers`
  - Returns the available instruments and their latest simulated prices.
- `GET /api/history?ticker=AAPL&points=120`
  - Returns mocked historical data with in-memory server-side caching.
- `POST /api/auth/login`
  - Mock login endpoint (accepts any non-empty username/password).
- `GET /api/auth/me`
  - Mock auth verification endpoint.
- `ws://<host>/api/ws`
  - Realtime subscription channel.
  - Client messages:
    - `{ "type": "subscribe", "symbol": "AAPL" }`
    - `{ "type": "unsubscribe", "symbol": "AAPL" }`
  - Server streams tick updates per subscribed symbol.

### Frontend

- Auth gating via Context (`providers/auth-provider.tsx`)
- React Query cache for tickers and historical API reads
- Real-time ticker grid and a selected instrument chart (`recharts`)
- Alert threshold input that triggers a visual warning when crossed

## Key Design Choices

- **Microservice-friendly structure**: market simulation and API contracts are isolated in `lib/market` and `app/api/*` so they can be extracted to a dedicated service later.
- **WebSocket over polling**: live prices stream from a single simulation source.
- **Hybrid caching**:
  - Server-side historical cache (20 seconds)
  - Client-side React Query stale-time caching
- **Mocked auth**: Context keeps state simple and avoids over-engineering.

## Run Locally

1. Use Node 22.
2. Install dependencies:

```bash
npm install
```

3. Start development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - starts custom Next + WebSocket server
- `npm run build` - production build
- `npm run start` - starts production server
- `npm run lint` - ESLint
- `npm run test` - unit tests (Node test runner via `tsx`)
- `npm run test:watch` - watch mode tests

## Testing

Unit tests cover backend market simulation behavior:

- ticker list generation
- realtime tick emission
- historical data cache behavior
- unknown ticker handling

Run:

```bash
npm run test
```

## Docker

Build image:

```bash
docker build -t multibank-realtime-dashboard .
```

Run container:

```bash
docker run --rm -p 3000:3000 multibank-realtime-dashboard
```

## Assumptions & Trade-offs

- Uses in-memory market simulation and cache (no persistent DB).
- Auth is intentionally mocked for challenge scope.
- WebSocket path is hosted by a custom Next server (`server.ts`) instead of a managed broker.
- No Kubernetes manifests included in this version.

## Bonus Features Implemented

- Mocked user authentication (Context-based)
- Historical data caching (server + React Query)
- Price threshold alerts in UI
