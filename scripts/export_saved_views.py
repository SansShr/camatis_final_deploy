"""Export the checked-in run for read-only views during backend cold starts.

Run from the repository root after deliberately updating the saved result files:
    python scripts/export_saved_views.py
No inference or optimization is performed here.
"""

import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.services.data_service import data_service


def export():
    results = data_service.load_results()
    if not results:
        raise RuntimeError("A successful saved run is required")
    public = ROOT / "camatis-frontend" / "public"
    public.mkdir(exist_ok=True)
    snapshot = {
        "/dashboard": data_service.get_dashboard_data(),
        "/results": results,
        "/routes": data_service.get_all_routes(),
        "/alerts": data_service.get_alerts(),
        "/agents/status": data_service.get_agent_system_status(),
    }
    for route in results:
        rid = route["route_id"]
        if rid > 0:
            snapshot[f"/route/R-{rid}"] = data_service.get_route_detail(f"R-{rid}")
    (public / "saved-data.json.gz").write_bytes(gzip.compress(json.dumps(snapshot, separators=(",", ":")).encode(), mtime=0))

    # Preserve every conflict/count, but omit the serialized Python decision
    # dump from the display snapshot. The full export remains on the backend.
    conflicts = data_service.get_all_conflicts()
    for conflict in conflicts:
        raw = conflict.get("final_action", "")
        if raw.startswith(("{", "[")):
            try:
                parsed = json.loads(raw)
                action = parsed.get("action") or parsed.get("primary_action")
                conflict["final_action"] = action if isinstance(action, str) else "Adjust bus service on this route"
            except (ValueError, AttributeError):
                conflict["final_action"] = "Adjust bus service on this route"
    (public / "saved-conflicts.json.gz").write_bytes(gzip.compress(json.dumps(conflicts, separators=(",", ":")).encode(), mtime=0))
    print(f"Saved {len(results)} route results and {len(conflicts)} conflict records")


if __name__ == "__main__":
    export()
