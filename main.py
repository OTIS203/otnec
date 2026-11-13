"""
NetScope Hugging Face Spaces entrypoint.
Named main.py (not app.py) to avoid shadowing the backend/app package.
"""
import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
sys.path.insert(0, backend_dir)

from app.main import app  # resolves to backend/app/main.py
from fastapi.responses import HTMLResponse
import uvicorn


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def root_home():
    return """<!DOCTYPE html>
<html>
<head>
  <title>NetScope API</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem;
            border-radius: 1rem; max-width: 480px; text-align: center; }
    h1 { color: #818cf8; margin-top: 0; }
    p  { color: #94a3b8; line-height: 1.6; }
    .btn { display: inline-block; background: #4f46e5; color: white; padding: .75rem 1.5rem;
           border-radius: .5rem; text-decoration: none; font-weight: 600; margin-top: 1rem; }
    .badge { background: #065f46; color: #6ee7b7; padding: .2rem .7rem;
             border-radius: 9999px; font-size: .75rem; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">&#10003; SYSTEM ONLINE</span>
    <h1>&#127757; NetScope Security API</h1>
    <p>Network Discovery, Threat Auditing &amp; Content Filtering Backend.<br>
       Connected to your Vercel dashboard.</p>
    <a class="btn" href="/docs">Open API Docs &rarr;</a>
  </div>
</body>
</html>"""


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
