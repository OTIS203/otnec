import sys
import os

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from app.main import app
from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
def root_home():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>NetScope API</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; max-width: 500px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            h1 { color: #818cf8; margin-top: 0; font-size: 1.75rem; }
            p { color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }
            .btn { display: inline-block; background: #4f46e5; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; margin-top: 1rem; }
            .btn:hover { background: #4338ca; }
            .badge { display: inline-block; background: #065f46; color: #6ee7b7; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-bottom: 1rem; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">SYSTEM ONLINE</span>
            <h1>NetScope Security API</h1>
            <p>Production-Grade Network Discovery, Threat Auditing & Continuous Monitoring Backend.</p>
            <a class="btn" href="/docs">Open Interactive API Docs</a>
        </div>
    </body>
    </html>
    """

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
