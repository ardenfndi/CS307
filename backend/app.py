import os, time, platform, psutil
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 5000))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

def collect_metrics():
    vm = psutil.virtual_memory()
    du = psutil.disk_usage("/")
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "host": platform.node(),
        "cpu": {"percent": psutil.cpu_percent(interval=0.2)},
        "memory": {"percent": vm.percent, "used": vm.used, "total": vm.total},
        "disk": {"percent": du.percent, "used": du.used, "total": du.total},
        "uptime_seconds": int(time.time() - psutil.boot_time()),
    }

@app.get("/api/metrics")
def api_metrics():
    try:
        return jsonify(collect_metrics())
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get("/api/processes")
def api_processes():
    try:
        q = (request.args.get("q") or "").lower()
        groups = {}
        for p in psutil.process_iter(attrs=["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                name = p.info["name"] or "Unknown"
                if q and q not in name.lower():
                    continue
                mi = p.memory_info()
                proc = {
                    "pid": p.pid,
                    "name": name,
                    "cpu": round(p.info["cpu_percent"] or 0, 1),
                    "mem": round(p.info["memory_percent"] or 0, 1),
                    "rss": mi.rss
                }
                if name not in groups:
                    groups[name] = {"name": name, "children": [], "count": 0, "cpu": 0, "mem": 0, "rss": 0}
                g = groups[name]
                g["children"].append(proc)
                g["count"] += 1
                g["cpu"] += proc["cpu"]
                g["mem"] += proc["mem"]
                g["rss"] += proc["rss"]
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        rows = sorted(groups.values(), key=lambda x: x["cpu"], reverse=True)
        return jsonify({"ok": True, "rows": rows})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post("/api/process/<int:pid>/terminate")
def terminate_proc(pid):
    try:
        psutil.Process(pid).terminate()
        return jsonify({"ok": True, "msg": f"Process {pid} terminated"})
    except psutil.NoSuchProcess:
        return jsonify({"ok": False, "error": "Process not found"}), 404
    except psutil.AccessDenied:
        return jsonify({"ok": False, "error": "Access denied"}), 403
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
