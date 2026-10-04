import os
import sys

# Ensure root directory is on python path for Vercel Serverless Functions
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.main import app

try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception:
    handler = app

# Export both app and handler for Vercel ASGI serverless entrypoint
app = app

