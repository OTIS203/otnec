# NetScope Deployment Guide: Vercel + Hugging Face Spaces 🚀

This guide explains how to connect your **Vercel frontend**, **Hugging Face backend**, and **Local Agent** into a unified, live network security platform.

---

## Architecture Overview

```
[ Local Office Network ]
   │
   ├── Staff Devices (iPhones, Androids, PCs)
   │     │ (DNS Queries to 192.168.1.246)
   │     ▼
   └── NetScope Local Agent (Go) on Office PC
         │
         │ (Uploads scan reports & DNS logs via HTTPS)
         ▼
[ Hugging Face Space (Backend API) ]
   https://<username>-<space-name>.hf.space
   ├── FastAPI REST API & WebSocket Stream
   ├── ML Anomaly Detection & Risk Scoring
   └── Automated Content Filtering Engine
         ▲
         │ (Fetches inventory, logs & real-time telemetry)
[ Vercel (Frontend Dashboard) ]
   https://your-netscope.vercel.app
   └── Next.js 14 Management UI (Access from anywhere)
```

---

## Step 1: Deploy Backend to Hugging Face Spaces

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
2. Fill in the details:
   - **Space name**: `netscope-backend` (or any name you prefer)
   - **License**: `apache-2.0`
   - **Select the Space SDK**: Click **Docker** (Blank).
   - **Space hardware**: `Free CPU (2 vCPU, 16 GB RAM)`
   - **Visibility**: `Public` (recommended so Vercel can reach it)
3. Click **"Create Space"**.

### Deploying the Code to your Space (2 Ways)

#### Option A: Sync from GitHub (Easiest)
1. In your newly created Hugging Face Space, click **Settings**.
2. Scroll to **"Connect a GitHub repository"**.
3. Select your repository: `OTIS203/otnec`.
4. Hugging Face will detect the `Dockerfile` and `README.md` metadata frontmatter and start building automatically!

#### Option B: Push directly via Git
In your terminal, add Hugging Face as a remote and push:
```bash
# Add Hugging Face remote (replace with your HF username and space name)
git remote add hf https://huggingface.co/spaces/OTIS203/netscope-backend

# Push to Hugging Face
git push hf main
```

---

## Step 2: Connect Vercel Frontend to Hugging Face Backend

Once your Hugging Face Space builds and reaches the **Running** status:
1. Your public backend API URL will be:
   ```text
   https://<your-hf-username>-netscope-backend.hf.space
   ```
   *(You can verify it by opening `https://<your-hf-username>-netscope-backend.hf.space/docs` to see the interactive Swagger API documentation).*

2. Open your **Vercel Project Dashboard** (for your deployed frontend).
3. Go to **Settings** -> **Environment Variables**.
4. Add a new variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://<your-hf-username>-netscope-backend.hf.space` (without trailing slash)
   - **Target**: Production, Preview, Development
5. Click **Save** and trigger a **Redeploy** on Vercel so the frontend picks up the new backend URL.

---

## Step 3: Connect your Local Office Agent to the Cloud

Run the NetScope Go agent on your office machine pointing to your Hugging Face cloud backend:

```powershell
cd "c:\Users\OLAK TECH\.gemini\network\agent"

# Run discovery scan and stream results to Hugging Face
.\netscope-agent.exe -server "https://<your-hf-username>-netscope-backend.hf.space" -cidr 192.168.1.0/24
```

To run continuous discovery in background daemon mode:
```powershell
.\netscope-agent.exe -daemon -interval 60 -server "https://<your-hf-username>-netscope-backend.hf.space"
```

All discovered devices, open ports, risk scores, and social media DNS logs will stream straight to your cloud database and appear instantly on your Vercel dashboard!

