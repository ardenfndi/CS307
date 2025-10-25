import os, time, platform
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import psutil

load_dotenv()

PORT = int(os.getenv("PORT", 5000))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

def collect_metrics():
    vm = psutil.virtual_memory()
    du = psutil.disk_usage("/")
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "host": platform.node(),
        "cpu": {"percent": psutil.cpu_percent(interval=0.3)},
        "memory": {
            "percent": vm.percent,
            "used": vm.used,
            "total": vm.total
        },
        "disk": {
            "percent": du.percent,
            "used": du.used,
            "total": du.total
        },
        "uptime_seconds": int(time.time() - psutil.boot_time()),
    }

@app.get("/api/metrics")
def metrics():
    return jsonify(collect_metrics())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
