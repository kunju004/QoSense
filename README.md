# QoSense
QoSense is a full-stack research platform that demonstrates intelligent scheduling of large language model inference requests across a heterogeneous edge cluster. Instead of using traditional heuristics like FCFS or round-robin, QoSense uses an LLM advisor to classify each incoming request by priority, analyze current system state, and route it to the most appropriate node — whether that's an edge GPU, edge CPU, mobile device, or cloud instance.
The platform compares four scheduling algorithms in real time: our LLM-guided approach, FCFS, Orca, and Sarathi-Serve. Across all tested workload types, the LLM-guided scheduler reduces SLO violations by 55–70% compared to FCFS, keeps average Time to First Token at 278ms against a 500ms target, and sustains 2.7× higher throughput under bursty traffic.
Built with React, Node.js, Express, and PostgreSQL, QoSense runs live simulations with configurable workloads and schedulers, streams LLM advisor decisions with full reasoning to a real-time dashboard, and persists every run to a database for historical comparison. It is deployable on Vercel and Render with zero infrastructure cost.
The project was developed as part of research into distributed LLM serving systems, with scheduling design inspired by Orca (OSDI '22), Sarathi-Serve (SOSP '23), and vLLM (SOSP '23).
# Adaptive QoS-Aware Scheduler — Full Stack App

**Stack:** React · Node.js/Express · PostgreSQL · JWT Auth · LLM Advisor (Anthropic/OpenAI/Mock)

## Project Structure

```
qos-app/
├── backend/
│   ├── src/
│   │   ├── index.js              ← Express server entry point
│   │   ├── db/
│   │   │   ├── index.js          ← PostgreSQL pool
│   │   │   └── migrate.js        ← Creates all tables
│   │   ├── middleware/
│   │   │   ├── auth.js           ← JWT verification
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js           ← POST /api/auth/signup|login|logout
│   │   │   ├── runs.js           ← CRUD for simulation runs
│   │   │   ├── scheduler.js      ← POST /api/scheduler/decide (LLM advisor)
│   │   │   └── analytics.js      ← GET /api/analytics/summary|compare
│   │   └── services/
│   │       ├── llmAdvisor.js     ← Anthropic / OpenAI / Mock advisor
│   │       └── scheduler.js      ← Heuristic scheduling logic + latency model
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── App.js                ← Layout, sidebar, routing
    │   ├── index.js
    │   ├── api/index.js          ← All fetch() calls to backend
    │   ├── context/AuthContext.js ← Global auth state
    │   ├── hooks/useSimulation.js ← Simulation loop + backend integration
    │   └── pages/
    │       ├── AuthPage.js       ← Login / Signup
    │       ├── SimulatorPage.js  ← Live QoS demo
    │       └── HistoryPage.js    ← Past runs from DB
    └── package.json
```

---

## Quick Start

### 1. PostgreSQL — Create the database

```bash
# Make sure PostgreSQL is running, then:
psql -U postgres -c "CREATE DATABASE qos_scheduler;"
```

### 2. Backend setup

```bash
cd qos-app/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set your DB password and optionally your LLM API key

# Run database migrations (creates all tables)
npm run db:migrate

# Start the server
npm run dev
# → Running on http://localhost:4000
```

### 3. Frontend setup

```bash
cd qos-app/frontend

# Install dependencies
npm install

# Start the app
npm start
# → Opens http://localhost:3000
# → Proxies /api/* to localhost:4000 automatically
```

---

## Environment Variables (backend/.env)

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | qos_scheduler |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | **set this** |
| `JWT_SECRET` | Secret for signing tokens | **change this** |
| `JWT_EXPIRES_IN` | Token lifetime | 7d |
| `PORT` | Backend port | 4000 |
| `FRONTEND_URL` | CORS allowed origin | http://localhost:3000 |
| `LLM_PROVIDER` | `anthropic` / `openai` / `mock` | mock |
| `ANTHROPIC_API_KEY` | Your Anthropic key | optional |
| `OPENAI_API_KEY` | Your OpenAI key | optional |

---

## LLM Advisor Modes

### Mock (default — no API key needed)
```
LLM_PROVIDER=mock
```
Uses template-based reasoning. Works instantly, great for demos.

### Anthropic Claude (recommended)
```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```
Uses `claude-haiku-4-5` for fast, cheap decisions (~$0.001 per scheduling decision).

### OpenAI
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```
Uses `gpt-4o-mini` with JSON mode.

---

## API Reference

### Auth
```
POST /api/auth/signup     { name, email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         → current user (requires token)
POST /api/auth/logout
```

### Simulation Runs
```
GET    /api/runs             → list all user's runs
POST   /api/runs             { schedulerMode, workloadType, name }
GET    /api/runs/:id         → run + requests + advisor decisions + node breakdown
PATCH  /api/runs/:id/end     { totalRequests, totalViolations, avgTtft, ... }
DELETE /api/runs/:id
```

### Scheduler
```
POST /api/scheduler/decide        → single request, calls LLM advisor if mode=llm
POST /api/scheduler/batch-decide  → multiple requests, heuristic scheduling
GET  /api/scheduler/advisor-log/:runId
```

### Analytics
```
GET /api/analytics/summary              → aggregate stats + scheduler comparison
GET /api/analytics/compare?runIds=a,b   → compare specific runs
```

---

## Database Schema

```sql
users               → id, name, email, password (hashed), role
simulation_runs     → id, user_id, scheduler_mode, workload_type, metrics...
requests            → id, run_id, priority, tokens, ttft/tpot/e2e, slo_violated
advisor_decisions   → id, run_id, request_id, reasoning, action, latency_ms
```

---

## Demo Flow 

1. Open app → sign up → land on Simulator
2. Set Scheduler = FCFS, Workload = Bursty → click **Run**
3. Watch SLO violations climb in the metrics + sparkline
4. Click Pause → Reset
5. Switch to Scheduler = LLM-Guided, same workload → Run
6. Watch advisor feed stream real reasoning decisions
7. Violations drop; interactive requests get GPU priority
8. Click **Run History** → show PostgreSQL-persisted comparison table
