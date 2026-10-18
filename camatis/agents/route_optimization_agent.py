"""
Agent 8: Route Optimization Agent
Tactical Layer - Evaluates route suitability and recommends rerouting when needed
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple


class RouteOptimizationAgent:
    """
    Assesses route suitability based on terrain, congestion, weather, and vehicle health.
    Recommends rerouting to alternate routes when conditions are poor.
    """
    
    def __init__(self):
        self.name = "Route Optimization Agent"
        self.layer = "Tactical"
        self.trust_weight = 0.9  # Tactical agent trust weight
        
        # Thresholds from specification
        self.STEEP_TERRAIN_THRESHOLD = 5.0  # degrees
        self.HEAVY_VEHICLE_THRESHOLD = 18000  # kg
        self.POOR_VEHICLE_HEALTH_THRESHOLD = 0.5
        self.CHRONIC_CONGESTION_THRESHOLD = 0.6
        
    def evaluate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Evaluate route suitability and recommend alternatives if needed.
        
        Inputs (from specification):
        - Route characteristics (terrain, historical congestion)
        - Current congestion (from blackboard)
        - Weather risk (from blackboard)
        - Vehicle health (from blackboard)
        
        Decision Process:
        Start with suitability_score = 1.0
        - Steep terrain (>5° slope): -0.3
        - Steep + heavy/unhealthy vehicle: -0.15 (mismatch)
        - Current congestion: -0.3 × congestion_score
        - Weather risk: -0.25 × weather_risk
        - Poor vehicle health: -0.2
        - Chronically congested route: -0.1
        
        Thresholds:
        - Suitability < 0.3: "Reroute - Poor Conditions" (priority 8) + reroute recommended
        - Suitability < 0.5: "Consider Alternate Route" (priority 5) + reroute recommended
        - Suitability < 0.7: "Monitor Route Conditions" (priority 2)
        
        Rerouting Logic: Find alternate with:
        1. Lower congestion
        2. Similar origin/destination
        3. Load < 0.6 (spare capacity)
        
        Args:
            route_data: Dictionary containing route characteristics and metrics
            blackboard: Shared blackboard for reading congestion/weather/vehicle data
            
        Returns:
            Dictionary with suitability_score, action, priority, reroute recommendation
        """
        # Extract route characteristics
        avg_slope = abs(route_data.get('avg_slope', 0.0))
        mass = route_data.get('mass', 15000)
        route_avg_congestion = route_data.get('route_avg_congestion', 0.0)
        route_id = route_data.get('route_id', 'unknown')
        
        # Read from blackboard if available
        congestion_score = 0.0
        weather_risk = 0.0
        vehicle_health = 1.0
        
        if blackboard:
            # Read current congestion
            if 'congestion_monitoring' in blackboard:
                cong_data = blackboard['congestion_monitoring'].get(route_id, {})
                congestion_score = cong_data.get('congestion_score', 0.0)
            
            # Read weather risk
            if 'weather_impact' in blackboard:
                weather_data = blackboard['weather_impact'].get(route_id, {})
                weather_risk = weather_data.get('risk_score', 0.0)
            
            # Read vehicle health
            if 'vehicle_health' in blackboard:
                vehicle_data = blackboard['vehicle_health'].get(route_id, {})
                vehicle_health = vehicle_data.get('health_score', 1.0)
        
        # Start with perfect suitability
        suitability_score = 1.0
        issues = []
        
        # Apply penalties from specification
        
        # 1. Steep terrain (>5° slope): -0.3
        if avg_slope > self.STEEP_TERRAIN_THRESHOLD:
            suitability_score -= 0.3
            issues.append(f"Steep terrain: {avg_slope:.1f}° slope")
            
            # 2. Steep + heavy/unhealthy vehicle: -0.15 (mismatch)
            if mass > self.HEAVY_VEHICLE_THRESHOLD or vehicle_health < self.POOR_VEHICLE_HEALTH_THRESHOLD:
                suitability_score -= 0.15
                issues.append("Steep terrain + heavy/unhealthy vehicle (mismatch)")
        
        # 3. Current congestion: -0.3 × congestion_score
        if congestion_score > 0:
            penalty = 0.3 * congestion_score
            suitability_score -= penalty
            issues.append(f"Current congestion: {congestion_score:.2f} (penalty: {penalty:.2f})")
        
        # 4. Weather risk: -0.25 × weather_risk
        if weather_risk > 0:
            penalty = 0.25 * weather_risk
            suitability_score -= penalty
            issues.append(f"Weather risk: {weather_risk:.2f} (penalty: {penalty:.2f})")
        
        # 5. Poor vehicle health: -0.2
        if vehicle_health < self.POOR_VEHICLE_HEALTH_THRESHOLD:
            suitability_score -= 0.2
            issues.append(f"Poor vehicle health: {vehicle_health:.2f}")
        
        # 6. Chronically congested route: -0.1
        if route_avg_congestion > self.CHRONIC_CONGESTION_THRESHOLD:
            suitability_score -= 0.1
            issues.append(f"Chronically congested: avg {route_avg_congestion:.2f}")
        
        # Clamp score to [0, 1]
        suitability_score = max(0.0, min(1.0, suitability_score))
        
        # Determine action, priority, and rerouting recommendation
        action, priority, reroute_recommended = self._determine_action(suitability_score, issues)
        
        # Find alternate route if rerouting recommended
        alternate_route = None
        reroute_reason = None
        if reroute_recommended:
            alternate_route, reroute_reason = self._find_alternate_route(
                route_data, congestion_score, blackboard
            )
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'suitability_score': round(suitability_score, 3),
            'action': action,
            'priority': priority,
            'reroute_recommended': reroute_recommended,
            'alternate_route': alternate_route,
            'reroute_reason': reroute_reason,
            'issues': issues,
            'trust_weight': self.trust_weight,
            'route_id': route_id
        }
        
        # Post to blackboard
        if blackboard is not None:
            if 'route_optimization' not in blackboard:
                blackboard['route_optimization'] = {}
            blackboard['route_optimization'][route_id] = result
        
        return result
    
    def _determine_action(self, suitability_score: float, issues: List[str]) -> Tuple[str, int, bool]:
        """
        Determine action, priority, and rerouting flag based on suitability score.
        
        Thresholds (from specification):
        - Suitability < 0.3: "Reroute - Poor Conditions" (priority 8) + reroute
        - Suitability < 0.5: "Consider Alternate Route" (priority 5) + reroute
        - Suitability < 0.7: "Monitor Route Conditions" (priority 2)
        """
        if suitability_score < 0.3:
            return ("Reroute - Poor Conditions", 8, True)
        elif suitability_score < 0.5:
            return ("Consider Alternate Route", 5, True)
        elif suitability_score < 0.7:
            return ("Monitor Route Conditions", 2, False)
        else:
            return ("Route Conditions Normal", 1, False)
    
    def _find_alternate_route(self, 
                             current_route: Dict[str, Any], 
                             current_congestion: float,
                             blackboard: Optional[Dict] = None) -> Tuple[Optional[str], Optional[str]]:
        """
        Find alternate route based on criteria from specification:
        1. Lower congestion
        2. Similar origin/destination (within 10km radius)
        3. Load < 0.6 (spare capacity)
        
        Args:
            current_route: Current route data
            current_congestion: Current congestion score
            blackboard: Shared blackboard containing other routes' data
            
        Returns:
            Tuple of (alternate_route_id, reroute_reason) or (None, None)
        """
        if not blackboard or 'congestion_monitoring' not in blackboard:
            return (None, "No alternate route data available")
        
        current_route_id = current_route.get('route_id', 'unknown')
        
        # Look for routes with better conditions
        best_alternate = None
        best_score = float('inf')
        
        for route_id, cong_data in blackboard['congestion_monitoring'].items():
            if route_id == current_route_id:
                continue
            
            # Check if alternate has lower congestion
            alternate_congestion = cong_data.get('congestion_score', 1.0)
            if alternate_congestion >= current_congestion:
                continue
            
            # Check if alternate has spare capacity (load < 0.6)
            # Try to read from fleet allocation or assume available
            load = 0.5  # Default assumption
            if 'fleet_allocation' in blackboard:
                fleet_data = blackboard['fleet_allocation'].get(route_id, {})
                # Estimate load from allocation score (lower is better)
                allocation_score = fleet_data.get('allocation_score', 0.5)
                load = allocation_score  # Rough proxy
            
            if load >= 0.6:
                continue  # No spare capacity
            
            # Calculate suitability score (lower congestion + spare capacity)
            score = alternate_congestion + load
            
            if score < best_score:
                best_score = score
                best_alternate = route_id
        
        if best_alternate:
            reason = f"Lower congestion (current: {current_congestion:.2f}, alternate has better conditions)"
            return (best_alternate, reason)
        else:
            return (None, "No suitable alternate route found (criteria: lower congestion, spare capacity)")
