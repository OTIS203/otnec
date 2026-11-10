# NetScope — Installation & Deployment Guide

This guide covers deployment options for **NetScope**:
1. Local Full-Stack Deployment via Docker Compose (Recommended for self-hosting).
2. Production Kubernetes Deployment via Helm.
3. Edge Go Agent installation on Linux, Raspberry Pi, and Windows.

---

## 1. Quickstart: Docker Compose

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+

### Steps
```bash
# 1. Clone repository
git clone https://github.com/netscope/netscope.git
cd netscope

# 2. Configure environment
cp .env.example .env
# Edit .env and change NETSCOPE_SECRET_KEY to a secure 32+ character random string

# 3. Start services
docker compose -f deploy/docker-compose.yml up -d
```

### Verification
- **Web UI:** Navigate to `http://localhost:3000`
- **FastAPI OpenAPI Documentation:** `http://localhost:8000/docs`
- **Health Check Endpoint:** `curl http://localhost:8000/health`

---

## 2. Production Kubernetes Deployment via Helm

### Prerequisites
- Kubernetes cluster v1.26+
- Helm v3.10+
- Ingress controller (e.g. `ingress-nginx`)

### Deployment
```bash
# 1. Add Helm chart repository or use local directory
cd deploy/helm/netscope

# 2. Customize values.yaml with your domain and secrets
# vim values.yaml

# 3. Deploy NetScope
helm upgrade --install netscope . \
  --namespace netscope \
  --create-namespace \
  --set ingress.hosts[0].host=netscope.yourdomain.com
```

---

## 3. Go Edge Agent Installation

The NetScope Agent compiles to a standalone, zero-dependency static binary.

### Linux / Raspberry Pi (systemd service)
```bash
# 1. Download release binary
curl -LO https://github.com/netscope/netscope/releases/latest/download/netscope-agent_Linux_x86_64.tar.gz
tar -xzf netscope-agent_Linux_x86_64.tar.gz
sudo mv netscope-agent /usr/local/bin/

# 2. Grant minimal raw network capabilities (least privilege: no root required)
sudo setcap cap_net_raw,cap_net_admin=+ep /usr/local/bin/netscope-agent

# 3. Create systemd unit (/etc/systemd/system/netscope-agent.service)
sudo tee /etc/systemd/system/netscope-agent.service <<EOF
[Unit]
Description=NetScope Network Monitoring Agent
After=network.target

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/netscope-agent --server https://netscope.yourdomain.com --token YOUR_ENROLL_TOKEN --daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 4. Enable and start agent
sudo systemctl daemon-reload
sudo systemctl enable --now netscope-agent
```

### Windows
```powershell
# Run from Administrator PowerShell:
.\netscope-agent.exe --server http://localhost:8000 --token YOUR_ENROLL_TOKEN --daemon
```
