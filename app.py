import sys
import os

# Add backend directory to Python path so app.* modules resolve
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import gradio as gr
from app.main import app as fastapi_app

# Create a clean status landing page inside Hugging Face Spaces
with gr.Blocks(title="NetScope API") as demo:
    gr.Markdown("# 🛡️ NetScope Network Security API")
    gr.Markdown("The backend server is live and actively serving requests.")
    gr.Markdown("---")
    gr.Markdown("### Useful Endpoints:")
    gr.Markdown("- 📖 **[OpenAPI Swagger Docs](/docs)**")
    gr.Markdown("- 🩺 **[System Health Check](/health)**")
    gr.Markdown("- 📡 **API Base:** `/api/v1`")
    gr.Markdown("---")
    gr.Markdown("🚀 *Configured for seamless communication with your Vercel frontend and local NetScope Agent.*")

# Mount Gradio onto the FastAPI application
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces serves on port 7860
    uvicorn.run(app, host="0.0.0.0", port=7860)
