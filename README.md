# Minecraft Dashboard

A self-hosted web dashboard to manage your Minecraft server running in Docker. Control your server, view real-time logs, manage players, and receive Discord notifications — all from a clean browser interface.

## Features

- **Server control** — Start, stop, restart your Docker container
- **Real-time console** — Live log streaming via WebSocket, persistent across page refreshes
- **Log filtering** — Filter by level (INFO / WARN / ERROR), search by keyword
- **Player management** — List online players, kick, ban, op/deop
- **TPS monitoring** — Server performance for Forge, NeoForge, Paper, Spigot, Purpur
- **Discord notifications** — Server online/offline/crash, player join/leave
- **CI/CD** — Auto-deploy via GitHub Actions when the server is empty (self-hosted runners)
- **Multi server-type support** — Vanilla, Forge, NeoForge, Paper, Spigot, Purpur, Fabric

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Frontend VM        │         │   Minecraft VM            │
│                     │         │                          │
│  React + Vite       │─HTTP/WS─▶  Agent (Node.js API)     │
│  TailwindCSS        │         │  Express + WebSocket     │
│  Port 5173          │         │  Port 3001               │
│                     │         │       │                  │
└─────────────────────┘         │  Docker socket           │
                                │       │                  │
                                │  ┌────▼────────────┐     │
                                │  │ Minecraft Server │     │
                                │  │  (Docker)        │     │
                                │  └─────────────────┘     │
                                └──────────────────────────┘
```

## Prerequisites

### Minecraft VM
- Linux (Ubuntu/Debian recommended)
- Docker + Docker Compose
- Node.js 18+ and npm
- PM2 (`npm install -g pm2`)
- Minecraft server container with RCON enabled

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

Create the environment file:

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```env
PORT=3001
DOCKER_SOCKET=/var/run/docker.sock
CONTAINER_NAME=minecraft          # Name of your Docker container

RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=YourRconPassword
RCON_TIMEOUT=5000

SERVER_TYPE=neoforge              # vanilla | forge | neoforge | paper | spigot | fabric | purpur

DISCORD_WEBHOOK_URL=              # Optional — leave empty to disable
DISCORD_NOTIFY_PLAYERS=true
```

> **SERVER_TYPE** affects TPS parsing. Use `paper` for Paper/Spigot/Purpur, `forge` or `neoforge` for modded, `vanilla` for everything else.

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
# Expected: {"ok":true,"serverType":"neoforge"}
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

## Discord Webhooks (Optional)

To receive Discord notifications:

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

Automatically deploy on every push to `main`, but **only when no players are online**.

### How it works

1. Push to `main`
2. GitHub Actions checks if any players are online via the agent API
3. If the server is empty → pulls latest code → restarts services
4. Frontend rebuild is triggered after the agent deploys successfully

### Setup

#### Step 1 — Install self-hosted runners

GitHub-hosted runners cannot reach VMs on a private network. You need to install runners directly on your VMs.

**On the Minecraft VM:**

Go to your GitHub repo → **Settings** → **Actions** → **Runners** → **New self-hosted runner**

Select Linux, then follow the instructions. When prompted for labels, use:

```
agent
```

Install as a systemd service so it survives reboots:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

**On the Frontend VM:**

Repeat the same process. When prompted for labels, use:

```
frontend
```

Verify both runners appear as **Online** in GitHub → Settings → Actions → Runners.

#### Step 2 — No secrets needed

Since the runners run directly on your VMs, the workflow uses `localhost` to communicate with the agent. No SSH keys or IP addresses need to be stored in GitHub Secrets.

#### Step 3 — Push to deploy

```bash
git push origin main
```

The workflow will:
1. Check player count via `http://localhost:3001/api/players`
2. Skip deployment if players are online
3. Pull + install + restart agent
4. Pull + build + restart frontend

---

## Project Structure

```
minecraft-dashboard/
├── agent/                    # Backend API (runs on Minecraft VM)
│   ├── src/
│   │   ├── index.js          # Express server entry point
│   │   ├── config.js         # Environment config
│   │   ├── adapters/         # Server-type adapters (vanilla, forge, paper…)
│   │   ├── routes/           # API routes (server, players, console)
│   │   ├── services/         # Docker, RCON, Discord, monitor, log buffer
│   │   └── ws/               # WebSocket handler
│   └── .env.example
│
├── frontend/                 # React dashboard (runs on Frontend VM)
│   ├── src/
│   │   ├── components/       # Overview, Console, Players, Sidebar
│   │   ├── hooks/            # useServer, useWebSocket
│   │   └── api/              # HTTP client
│   └── .env.example
│
└── .github/
    └── workflows/
        └── deploy.yml        # CI/CD pipeline
```

---

## API Reference

All endpoints are served from the agent on port `3001`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Agent health check |
| `GET` | `/api/server/status` | Container status, RCON, players, TPS |
| `POST` | `/api/server/start` | Start the container |
| `POST` | `/api/server/stop` | Stop the container |
| `POST` | `/api/server/restart` | Restart the container |
| `GET` | `/api/players` | List online players |
| `POST` | `/api/players/:name/kick` | Kick a player |
| `POST` | `/api/players/:name/ban` | Ban a player |
| `POST` | `/api/players/:name/op` | Grant OP |
| `POST` | `/api/players/:name/deop` | Revoke OP |
| `POST` | `/api/console/command` | Send RCON command |
| `GET` | `/api/console/logs?tail=200` | Get last N log lines |
| `WS` | `/ws/logs` | Real-time log stream |

---

## Troubleshooting

**Agent won't start / `Cannot find package 'express'`**
```bash
cd ~/minecraft-dashboard/agent && npm install
```

**CORS error in browser**
Check that `VITE_AGENT_URL` in the frontend `.env` points to the correct agent IP (not `localhost`), then rebuild: `npm run build && pm2 restart minecraft-dashboard`.

**No Discord notifications on server restart**
This is a known timing issue when Docker restart completes in under 30 seconds. Upgrade to the latest version — it was fixed by triggering an immediate poll after restart.

**Logs not showing in console**
The agent streams Docker logs directly. Make sure the container is running and the agent has access to the Docker socket (`sudo usermod -aG docker $USER`).

**PM2 pointing to old path after moving the repo**
```bash
pm2 delete minecraft-agent
cd ~/minecraft-dashboard/agent
pm2 start src/index.js --name minecraft-agent
pm2 save
```

**GitHub Actions runner offline**
```bash
# On the relevant VM:
sudo systemctl status actions.runner.*
sudo systemctl start actions.runner.*
```
