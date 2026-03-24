# Minecraft Dashboard

A self-hosted web dashboard to manage one or more Minecraft servers running in Docker. Control your servers, view real-time logs, manage players, and receive Discord notifications — all from a clean browser interface.

## Features

- **Multi-server support** — Manage multiple Minecraft servers from a single dashboard
- **Server control** — Start, stop, restart Docker containers
- **Real-time console** — Live log streaming via WebSocket, persistent across page refreshes
- **Log filtering** — Filter by level (INFO / WARN / ERROR), search by keyword
- **Player management** — List online players, kick, ban, op/deop
- **TPS monitoring** — Server performance for Forge, NeoForge, Paper, Spigot, Purpur
- **Auto-restart** — Daily scheduled restart with in-game warnings and player protection
- **Discord notifications** — Server online/offline/crash, player join/leave
- **CI/CD** — Auto-deploy via GitHub Actions when all servers are empty (self-hosted runners)
- **Multi server-type support** — Vanilla, Forge, NeoForge, Paper, Spigot, Purpur, Fabric

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────────────┐
│   Frontend VM        │         │   Minecraft VM                    │
│                     │         │                                  │
│  React + Vite       │─HTTP/WS─▶  Agent (Node.js API)             │
│  TailwindCSS        │         │  Express + WebSocket             │
│  Port 5173          │         │  Port 3001                       │
│                     │         │       │                          │
└─────────────────────┘         │  Docker socket                   │
                                │       │                          │
                                │  ┌────▼──────┐  ┌────────────┐  │
                                │  │ Server #1  │  │ Server #2  │  │
                                │  │ (Docker)   │  │ (Docker)   │  │
                                │  └───────────┘  └────────────┘  │
                                └──────────────────────────────────┘
```

> All Minecraft containers must be on the same VM as the agent (Docker socket access required).

## Prerequisites

### Minecraft VM
- Linux (Ubuntu/Debian recommended)
- Docker + Docker Compose
- Node.js 18+ and npm
- PM2 (`npm install -g pm2`)
- Minecraft server container(s) with RCON enabled

### Frontend VM
- Linux
- Node.js 18+ and npm
- PM2 (`npm install -g pm2`)

### Your machine (for setup)
- Git
- A GitHub account

---

## Installation

### 1. Prepare your Minecraft server

Make sure your `docker-compose.yml` has RCON enabled:

```yaml
services:
  minecraft:
    image: itzg/minecraft-server:java21
    environment:
      EULA: "TRUE"
      ENABLE_RCON: "true"
      RCON_PASSWORD: "YourRconPassword"
      RCON_PORT: 25575
    ports:
      - "25565:25565"
      - "25575:25575"  # RCON port (keep internal or behind firewall)
```

> **Security note:** Do not expose RCON port publicly. Keep it accessible only internally (localhost or LAN).

### 2. Clone the repository

On **both VMs**, clone the repo:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git ~/minecraft-dashboard
```

---

### 3. Set up the Agent (Minecraft VM)

```bash
cd ~/minecraft-dashboard/agent
npm install
```

**Create the environment file:**

```bash
cp .env.example .env
nano .env
```

```env
PORT=3001
DOCKER_SOCKET=/var/run/docker.sock

# Discord Webhook (optional — leave empty to disable)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXXXXXXXX/XXXXXXXXXX
DISCORD_NOTIFY_PLAYERS=true
```

**Create the servers config file:**

```bash
cp servers.json.example servers.json
nano servers.json
```

```json
[
  {
    "id": "survival",
    "name": "Survival",
    "containerName": "minecraft",
    "rconHost": "localhost",
    "rconPort": 25575,
    "rconPassword": "YourRconPassword",
    "serverType": "neoforge",
    "autoRestart": {
      "enabled": true,
      "time": "04:00",
      "skipIfPlayersOnline": true
    }
  }
]
```

> **`id`** must be unique and URL-safe (no spaces). It appears in the browser URL.
> **`serverType`** affects TPS parsing: `paper` for Paper/Spigot/Purpur, `forge`/`neoforge` for modded, `vanilla` for everything else.
> **`servers.json` is never committed to git** — it contains your RCON passwords.

To add a second server, add another object to the array with a different `id`, `containerName`, and `rconPort`.

Make sure your user has access to the Docker socket:

```bash
sudo usermod -aG docker $USER
# Log out and back in for the change to take effect
```

Start the agent with PM2:

```bash
pm2 start src/index.js --name minecraft-agent
pm2 save
pm2 startup  # Follow the printed command to enable autostart
```

Verify it works:

```bash
curl http://localhost:3001/health
# Expected: {"ok":true,"servers":[{"id":"survival","name":"Survival"}]}
```

---

### 4. Set up the Frontend (Frontend VM)

```bash
cd ~/minecraft-dashboard/frontend
npm install
```

Create the environment file:

```bash
cp .env.example .env
nano .env
```

```env
VITE_AGENT_URL=http://192.168.1.XXX:3001   # Replace with your Minecraft VM's local IP
```

> To find the Minecraft VM's IP: run `ip a` or `hostname -I` on that machine.

Build and start the frontend:

```bash
npm run build
pm2 start "npm run dev -- --host" --name minecraft-dashboard
pm2 save
pm2 startup  # Follow the printed command
```

The dashboard is now accessible at `http://<frontend-vm-ip>:5173`.

---

## Auto-Restart

Each server can be configured to restart automatically at a fixed time every day.

```json
"autoRestart": {
  "enabled": true,
  "time": "04:00",
  "skipIfPlayersOnline": true
}
```

| Option | Description |
|--------|-------------|
| `enabled` | Enable or disable the scheduler |
| `time` | Restart time in `HH:MM` format (uses the agent VM's local timezone) |
| `skipIfPlayersOnline` | Cancel the restart if players are connected — retries the next day |

**Timeline on restart day:**
- `T-5min` — `§e[Auto] Le serveur redémarre dans 5 minutes.`
- `T-1min` — `§c[Auto] Le serveur redémarre dans 1 minute !`
- `T-0` — Restart + Discord notifications (offline → online)

The scheduler logs the next scheduled restart on startup:
```
[Scheduler:survival] Prochain redémarrage : 25/03/2026 04:00:00
```

---

## Discord Webhooks (Optional)

1. In Discord, go to your server → **Channel Settings** → **Integrations** → **Webhooks**
2. Create a new webhook, copy the URL
3. Paste it into `DISCORD_WEBHOOK_URL` in the agent's `.env`
4. Restart the agent: `pm2 restart minecraft-agent`

**Notification events:**

| Event | Trigger |
|-------|---------|
| ✅ Server online | Container starts |
| 🔴 Server offline | Intentional stop or restart |
| 💥 Server crash | Unexpected stop |
| 👤 Player joined | Player connect (if `DISCORD_NOTIFY_PLAYERS=true`) |
| 👋 Player left | Player disconnect (if `DISCORD_NOTIFY_PLAYERS=true`) |

---

## CI/CD with GitHub Actions

Automatically deploys on every push to `main`, but **only when no players are online on any server**.

### How it works

1. Push to `main`
2. Agent VM: checks total online players across all servers
3. If all servers are empty → pulls code → restarts agent
4. Frontend VM: pulls code → rebuilds → restarts frontend

### Setup

#### Step 1 — Install self-hosted runners

GitHub-hosted runners cannot reach VMs on a private network. Install runners directly on your VMs.

**On the Minecraft VM:**

Go to your GitHub repo → **Settings** → **Actions** → **Runners** → **New self-hosted runner**

Select Linux, follow the instructions. When prompted for labels, enter:
```
agent
```

Install as a systemd service so it survives reboots:
```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

**On the Frontend VM:** repeat with label `frontend`.

Verify both runners appear as **Online** in GitHub → Settings → Actions → Runners.

#### Step 2 — No secrets needed

Runners run directly on your VMs and communicate via `localhost`. No SSH keys or IP addresses need to be stored in GitHub Secrets.

#### Step 3 — Push to deploy

```bash
git push origin main
```

---

## Project Structure

```
minecraft-dashboard/
├── agent/                      # Backend API (runs on Minecraft VM)
│   ├── src/
│   │   ├── index.js            # Express server entry point
│   │   ├── config.js           # Global environment config
│   │   ├── adapters/           # Server-type adapters (vanilla, forge, paper…)
│   │   ├── routes/
│   │   │   └── servers.js      # All API routes (/api/servers/*)
│   │   ├── services/
│   │   │   ├── serverRegistry.js  # Loads servers.json, holds per-server state
│   │   │   ├── docker.js          # Docker container management (factory)
│   │   │   ├── rcon.js            # RCON client (factory)
│   │   │   ├── monitor.js         # Status polling + Discord events (factory)
│   │   │   ├── scheduler.js       # Daily auto-restart scheduler
│   │   │   ├── discord.js         # Discord webhook sender
│   │   │   └── logBuffer.js       # In-memory log buffer (factory)
│   │   └── ws/
│   │       └── index.js           # WebSocket handler (/ws/logs/:id)
│   ├── .env.example
│   └── servers.json.example    # Server config template (copy → servers.json)
│
├── frontend/                   # React dashboard (runs on Frontend VM)
│   ├── src/
│   │   ├── components/         # Overview, Console, Players, Sidebar
│   │   ├── hooks/              # useServer, useWebSocket
│   │   └── api/                # HTTP + WebSocket client
│   └── .env.example
│
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD pipeline
```

---

## API Reference

All endpoints are served from the agent on port `3001`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Agent health check |
| `GET` | `/api/servers` | List all servers with live running state |
| `GET` | `/api/servers/:id/status` | Full status (container, RCON, players, TPS) |
| `POST` | `/api/servers/:id/start` | Start the container |
| `POST` | `/api/servers/:id/stop` | Stop the container |
| `POST` | `/api/servers/:id/restart` | Restart the container |
| `GET` | `/api/servers/:id/players` | List online players |
| `POST` | `/api/servers/:id/players/:name/kick` | Kick a player |
| `POST` | `/api/servers/:id/players/:name/ban` | Ban a player |
| `POST` | `/api/servers/:id/players/:name/op` | Grant OP |
| `POST` | `/api/servers/:id/players/:name/deop` | Revoke OP |
| `POST` | `/api/servers/:id/console/command` | Send RCON command |
| `GET` | `/api/servers/:id/console/logs?tail=200` | Get last N log lines |
| `WS` | `/ws/logs/:id` | Real-time log stream |
| `GET` | `/api/players` | Total online players across all servers (CI/CD compat) |

---

## Troubleshooting

**Agent won't start — `servers.json introuvable`**
```bash
cd ~/minecraft-dashboard/agent
cp servers.json.example servers.json
nano servers.json  # fill in your server details
pm2 restart minecraft-agent
```

**Agent won't start — `Cannot find package 'express'`**
```bash
cd ~/minecraft-dashboard/agent && npm install
```

**"Aucun serveur configuré" on the frontend**
The agent is likely crashed. Check logs: `pm2 logs minecraft-agent --lines 30`

**CORS error in browser**
Check that `VITE_AGENT_URL` in the frontend `.env` points to the correct agent IP (not `localhost`), then rebuild:
```bash
npm run build && pm2 restart minecraft-dashboard
```

**Log filters not working (all logs show as RAW)**
Make sure you are on the latest version — the log regex was updated to support the NeoForge `[Thread/LEVEL] [mod/]:` format.

**Logs not showing in console**
Make sure the container is running and the agent has Docker socket access:
```bash
sudo usermod -aG docker $USER  # then log out and back in
```

**PM2 pointing to old path after moving the repo**
```bash
pm2 delete minecraft-agent
cd ~/minecraft-dashboard/agent
pm2 start src/index.js --name minecraft-agent
pm2 save
```

**GitHub Actions runner offline**
```bash
sudo systemctl status actions.runner.*
sudo systemctl start actions.runner.*
```
