import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np

from backend.config import OUTPUT_FILE

class DataService:
    """Service to read data from your existing CAMATIS outputs"""
    
    def __init__(self):
        self._cached_results = None
        self._cached_timestamp = None
    
    def load_results(self) -> Optional[List[Dict[str, Any]]]:
        """Load results from final_output.json"""
        if os.path.exists(OUTPUT_FILE):
            # Check if file was modified since last read
            file_mtime = os.path.getmtime(OUTPUT_FILE)
            if self._cached_timestamp != file_mtime:
                with open(OUTPUT_FILE, 'r') as f:
                    self._cached_results = json.load(f)
                    self._cached_timestamp = file_mtime
            return self._cached_results
        return None
    
    def get_all_routes(self) -> List[Dict[str, Any]]:
        """Get all routes from results with source/destination metadata"""
        from backend.services.route_metadata import get_route_info
        results = self.load_results()
        if not results:
            return []
        
        routes = []
        for r in results:
            rid = r.get('route_id', -1)
            if rid <= 0:
                continue

            load = r.get("waiting_passengers", 50)
            demand = round(r.get("demand_after", 0), 0)
            actions = r.get("actions", [])

            if r.get("anomaly", False):
                status = "Needs Review"
            elif load > 85:
                status = "Watch Closely"
            elif r.get("high_uncertainty", False):
                status = "Watch Closely"
            else:
                status = "Running Fine"

            meta = get_route_info(rid)

            routes.append({
                "id": f"R-{rid}",
                "route_id": rid,
                "source": meta["source"],
                "destination": meta["destination"],
                "demand": demand,
                "load_factor": round(load, 1),
                "status": status,
                "buses_added": r.get("buses_added", 0),
                "frequency_multiplier": r.get("frequency_multiplier", 1.0),
                "rerouted_to": r.get("rerouted_to"),
                "actions": actions,
                "high_uncertainty": r.get("high_uncertainty", False),
                "anomaly": r.get("anomaly", False),
            })

        routes.sort(key=lambda x: x['route_id'])
        return routes
    
    def get_route_detail(self, route_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed data for a specific route"""
        from backend.services.route_metadata import get_route_info
        route_num = route_id.replace("R-", "")
        results = self.load_results()
        
        if not results:
            return None
        
        # Find the route
        route_data = None
        for r in results:
            if str(r.get("route_id", "")) == route_num:
                route_data = r
                break
        
        if not route_data:
            return None
        
        # Generate hourly trends based on actual data
        hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
        demand_patterns = [0.5, 1.5, 1.2, 1.3, 1.1, 1.4, 1.6, 1.0, 0.6]
        load_patterns = [0.4, 0.9, 0.8, 0.85, 0.75, 0.9, 1.0, 0.7, 0.5]
        
        demand_base = route_data.get("demand_after", 500)
        load_base = route_data.get("waiting_passengers", 65)
        
        demand_trend = [
            {"time": hour, "demand": round(demand_base * pattern, 0)}
            for hour, pattern in zip(hours, demand_patterns)
        ]
        
        load_trend = [
            {"time": hour, "load": round(load_base * pattern, 1)}
            for hour, pattern in zip(hours, load_patterns)
        ]
        
        # Confidence based on uncertainty
        confidence = 95 if not route_data.get("high_uncertainty", False) else 70
        
        # Build recommendations from actual actions
        actions = route_data.get("actions", [])
        
        recommendations = {
            "frequency_multiplier": f"{route_data.get('frequency_multiplier', 1.0)}x",
            "buses_to_add": f"+{route_data.get('buses_added', 0)} Buses" if route_data.get('buses_added', 0) > 0 else "0 Buses",
            "reroute_suggestion": f"Route {route_data.get('rerouted_to')}" if route_data.get('rerouted_to') else "No change needed"
        }
        
        # Map actions to badges
        action_badges = []
        for action in actions:
            if action == "Increase Frequency":
                action_badges.append({"label": action, "color": "blue"})
            elif action == "Allocate Extra Bus":
                action_badges.append({"label": action, "color": "green"})
            elif action == "High Demand Risk":
                action_badges.append({"label": action, "color": "orange"})
            elif action == "Investigate Anomaly":
                action_badges.append({"label": action, "color": "red"})
            else:
                action_badges.append({"label": action, "color": "yellow"})
        
        if not action_badges:
            action_badges.append({"label": "Monitor Load", "color": "yellow"})
        
        meta = get_route_info(int(route_num) if route_num.lstrip('-').isdigit() else 0)

        return {
            "demand_trend": demand_trend,
            "load_trend": load_trend,
            "confidence": confidence,
            "recommendations": recommendations,
            "action_badges": action_badges,
            "source": meta["source"],
            "destination": meta["destination"],
            "stops": meta["stops"]
        }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get dashboard overview data with anomaly detection"""
        results = self.load_results()
        
        if not results:
            return {
                "stats": {
                    "total_routes": 0,
                    "active_buses": 0,
                    "high_demand_routes": 0,
                    "anomalies": 0,
                    "avg_load_factor": 0,
                    "avg_demand": 0
                },
                "demand": [],
                "load": [],
                "alerts": []
            }
        
        # Calculate stats
        total_routes = len(results)
        
        # Calculate high demand routes (demand > 300)
        high_demand_routes = sum(1 for r in results if r.get("demand_after", 0) > 300)
        
        # CALCULATE ANOMALIES BASED ON MULTIPLE FACTORS
        anomalies = 0
        anomaly_routes = []
        
        for r in results:
            is_anomaly = False
            reason = []
            
            demand = r.get("demand_after", 0)
            waiting = r.get("waiting_passengers", 0)
            actions = r.get("actions", [])
            
            # 1. Check if already flagged by ML model
            if r.get("anomaly", False):
                is_anomaly = True
                reason.append("ML anomaly flag")
            
            # 2. Check for unusually high waiting passengers (>100)
            if waiting > 100:
                is_anomaly = True
                reason.append(f"High waiting ({waiting:.0f})")
            
            # 3. Check for demand spike (>500)
            if demand > 500:
                is_anomaly = True
                reason.append(f"Demand spike ({demand:.0f})")
            
            # 4. Check for Investigate Anomaly action from agents
            if "Investigate Anomaly" in actions:
                is_anomaly = True
                reason.append("Agent flagged for investigation")
            
            # 5. Check for High Demand Risk with relatively low demand (potential false positive)
            if "High Demand Risk" in actions and demand < 200:
                is_anomaly = True
                reason.append("False positive risk flag")
            
            # 6. Check for extreme load factor (>80%)
            load_factor = r.get("load_factor", 0)
            if load_factor > 80:
                is_anomaly = True
                reason.append(f"Overload ({load_factor:.0f}%)")
            
            if is_anomaly:
                anomalies += 1
                anomaly_routes.append({
                    "route": r.get("route_id"),
                    "demand": demand,
                    "waiting": waiting,
                    "reason": ", ".join(reason)
                })
        
        # Print debug info
        print(f"[DEBUG] Anomalies detected: {anomalies}")
        for a in anomaly_routes[:5]:
            print(f"  Route {a['route']}: {a['reason']}")
        
        # Calculate active buses
        total_buses = sum(r.get("buses_added", 0) for r in results) + total_routes
        
        # Calculate averages
        avg_demand = sum(r.get("demand_after", 0) for r in results) / total_routes if total_routes > 0 else 0
        avg_waiting = sum(r.get("waiting_passengers", 0) for r in results) / total_routes if total_routes > 0 else 0
        avg_load_factor = min(100, (avg_waiting / max(avg_demand, 1)) * 10) if avg_demand > 0 else 0
        
        # Generate hourly demand pattern
        hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
        patterns = [0.3, 1.4, 1.3, 1.2, 1.0, 1.3, 1.5, 0.9, 0.5]
        
        demand_data = [
            {"time": hour, "demand": round(avg_demand * pattern, 0)}
            for hour, pattern in zip(hours, patterns)
        ]
        
        # Get top routes for load chart - use real load_factor from agent_route_details
        load_data = []
        try:
            agent_file = os.path.join(os.path.dirname(OUTPUT_FILE), 'agent_route_details.json')
            if os.path.exists(agent_file):
                with open(agent_file) as f:
                    agent_data = json.load(f)
                all_loads = [
                    {"route": f"R-{r['route_id']}", "load": round(r['final_decision'].get('load', 0.5), 3)}
                    for r in agent_data
                    if r.get('route_id', -1) > 0 and r.get('final_decision', {}).get('load') is not None
                ]
                # Sample across the full range for a representative spread
                all_loads.sort(key=lambda x: x['load'])
                n = len(all_loads)
                if n >= 8:
                    # Pick 8 evenly spaced routes to show the variety
                    indices = [int(i * (n - 1) / 7) for i in range(8)]
                    load_data = [all_loads[i] for i in indices]
                else:
                    load_data = all_loads
        except Exception as e:
            print(f"[WARN] Could not load agent route details for chart: {e}")
        if not load_data:
            load_data = [
                {"route": f"R-{r.get('route_id')}", "load": min(0.99, round(r.get("waiting_passengers", 10) / 20.0, 3))}
                for r in results[:6]
            ]
        
        # Generate alerts (prioritize anomalies)
        alerts = []
        alert_id = 1
        
        # First add anomaly alerts
        for r in anomaly_routes[:10]:
            severity = "High" if "spike" in r["reason"] or "Overload" in r["reason"] else "Medium"
            alerts.append({
                "id": alert_id,
                "route": f"R-{r['route']}",
                "message": f"Anomaly: {r['reason']}",
                "severity": severity,
                "time": datetime.now().strftime("%I:%M %p")
            })
            alert_id += 1
        
        # Then add high waiting alerts if not already covered
        for r in results[:15]:
            waiting = r.get("waiting_passengers", 0)
            route_id = r.get("route_id")
            
            # Skip if already in anomalies
            if any(a["route"] == route_id for a in anomaly_routes):
                continue
            
            if waiting > 50:
                severity = "High" if waiting > 100 else "Medium"
                alerts.append({
                    "id": alert_id,
                    "route": f"R-{route_id}",
                    "message": f"High waiting: {waiting:.0f} passengers",
                    "severity": severity,
                    "time": datetime.now().strftime("%I:%M %p")
                })
                alert_id += 1
        
        return {
            "stats": {
                "total_routes": total_routes,
                "active_buses": total_buses,
                "high_demand_routes": high_demand_routes,
                "anomalies": anomalies,
                "avg_load_factor": round(avg_load_factor, 1),
                "avg_demand": round(avg_demand, 0)
            },
            "demand": demand_data,
            "load": load_data,
            "alerts": alerts[:10]  # Limit to 10 alerts
        }
    
    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get alerts from anomalies and high uncertainty"""
        results = self.load_results()
        
        if not results:
            return []
        
        alerts = []
        for i, r in enumerate(results):
            should_alert = False
            message = ""
            
            # 1. Check for Investigate Anomaly action
            actions = r.get("actions", [])
            if "Investigate Anomaly" in actions:
                should_alert = True
                message = "This route showed an unusual pattern — the system has flagged it for a closer look"
            
            # 2. Check for high uncertainty (model confidence)
            # high_uncertainty is already set by MC Dropout
            elif r.get("high_uncertainty", False):
                should_alert = True
                # Uncertainty message about model confidence, NOT about demand
                message = "Passenger numbers on this route are harder than usual to predict — worth keeping an eye on"
            
            if should_alert:
                alerts.append({
                    "id": i + 1,
                    "route": f"R-{r.get('route_id')}",
                    "message": message,
                    "severity": "Medium",  # Both are medium severity
                    "time": datetime.now().strftime("%I:%M %p")
                })
        
        return alerts[:20]
    
    def get_agent_system_status(self) -> Optional[Dict[str, Any]]:
        """Get overall agent system status from agent_system_status.json"""
        status_file = os.path.join(os.path.dirname(OUTPUT_FILE), 'agent_system_status.json')
        
        if os.path.exists(status_file):
            with open(status_file, 'r') as f:
                return json.load(f)
        
        return None
    
    def get_route_agent_detail(self, route_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed agent decision information for a specific route"""
        agent_details_file = os.path.join(os.path.dirname(OUTPUT_FILE), 'agent_route_details.json')
        
        if not os.path.exists(agent_details_file):
            return None
        
        with open(agent_details_file, 'r') as f:
            all_details = json.load(f)
        
        # Find the specific route
        for detail in all_details:
            if detail.get('route_id') == route_id:
                return detail
        
        return None
    
    def get_all_conflicts(self) -> List[Dict[str, Any]]:
        """Get all conflict resolution details"""
        conflicts_file = os.path.join(os.path.dirname(OUTPUT_FILE), 'conflict_resolutions.json')
        
        if not os.path.exists(conflicts_file):
            return []
        
        with open(conflicts_file, 'r') as f:
            return json.load(f)
    
    def get_blackboard_snapshot(self) -> Optional[Dict[str, Any]]:
        """Get current blackboard communication system state"""
        blackboard_file = os.path.join(os.path.dirname(OUTPUT_FILE), 'blackboard_snapshot.json')
        
        if not os.path.exists(blackboard_file):
            return None
        
        with open(blackboard_file, 'r') as f:
            return json.load(f)
    
    def get_agent_scores_for_route(self, route_id: int) -> List[Dict[str, Any]]:
        """Get all agent scores for a specific route"""
        detail = self.get_route_agent_detail(route_id)
        
        if not detail or 'agent_scores' not in detail:
            return []
        
        return detail['agent_scores']

# Singleton instance
data_service = DataService()