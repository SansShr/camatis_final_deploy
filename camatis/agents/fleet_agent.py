"""
Agent 6: Fleet Agent
Tactical Layer - Manages bus allocation based on demand and operational constraints
"""

import numpy as np
from typing import Dict, Any, List, Optional


class FleetAgent:
    """
    Allocates buses dynamically based on load predictions, vehicle health, demand, and weather.
    Enhanced with multi-factor decision scoring and constraint checking.
    """
    
    def __init__(self, available_buses=10):
        self.name = "Fleet Agent"
        self.layer = "Tactical"
        self.trust_weight = 0.9  # Tactical agent trust weight
        self.available_buses = available_buses
        
        # Thresholds from specification
        self.HIGH_LOAD_THRESHOLD = 0.7
        self.MODERATE_LOAD_THRESHOLD = 0.55
        self.HIGH_LOAD_UNCERTAINTY_THRESHOLD = 0.15
        self.POOR_VEHICLE_HEALTH_THRESHOLD = 0.5
        self.VERY_HIGH_DEMAND_THRESHOLD = 400
        self.MODERATE_DEMAND_THRESHOLD = 250
        self.LOW_DEMAND_THRESHOLD = 120
        self.ADVERSE_WEATHER_THRESHOLD = 0.6
        
    def allocate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Determine bus allocation for a route.
        
        Inputs (from specification):
        - Load prediction
        - Vehicle health (from blackboard)
        - Demand (from blackboard or direct)
        - Weather risk (from blackboard)
        - Available buses
        
        Decision Process:
        Start with allocation_score = 0.0, buses_needed = 0
        - High load (>0.7): +0.5, +2 buses
        - Moderate load (>0.55): +0.3, +1 bus
        - High load uncertainty: +0.25, +1 bus (safety buffer)
        - Poor vehicle health (<0.5): +0.3, +1 backup bus
        - Very high demand (>400): +0.2, +2 buses
        - Adverse weather (>0.6 risk): +0.15, +1 backup (breakdowns more likely)
        Constraint: buses_needed capped by available_buses
        
        Args:
            route_data: Dictionary containing predictions and metrics
            blackboard: Shared blackboard for reading vehicle/weather/demand data
            
        Returns:
            Dictionary with allocation_score, action, priority, buses_needed
        """
        # Extract inputs
        load = route_data.get('load_factor', 0)
        load_uncertainty = route_data.get('load_std', 0)
        demand = route_data.get('passenger_demand', 0)
        route_id = route_data.get('route_id', 'unknown')
        
        # Read from blackboard if available
        vehicle_health = 1.0
        weather_risk = 0.0
        
        if blackboard:
            # Read vehicle health
            if 'vehicle_health' in blackboard:
                vehicle_data = blackboard['vehicle_health'].get(route_id, {})
                vehicle_health = vehicle_data.get('health_score', 1.0)
            
            # Read weather risk
            if 'weather_impact' in blackboard:
                weather_data = blackboard['weather_impact'].get(route_id, {})
                weather_risk = weather_data.get('risk_score', 0.0)
            
            # Read demand assessment
            if 'demand_assessment' in blackboard:
                demand_data = blackboard['demand_assessment'].get(route_id, {})
                demand = demand_data.get('demand', demand)  # Override if available
        
        # Start with zero allocation score
        allocation_score = 0.0
        buses_needed = 0
        reasons = []
        
        # Apply allocation logic from specification
        
        # 1. High load (>0.7): +0.5, +2 buses
        if load > self.HIGH_LOAD_THRESHOLD:
            allocation_score += 0.5
            buses_needed += 2
            reasons.append(f"High load: {load:.2f} (+2 buses)")
        # 2. Moderate load (>0.55): +0.3, +1 bus
        elif load > self.MODERATE_LOAD_THRESHOLD:
            allocation_score += 0.3
            buses_needed += 1
            reasons.append(f"Moderate load: {load:.2f} (+1 bus)")
        
        # 3. High load uncertainty: +0.25, +1 bus (safety buffer)
        if load_uncertainty > self.HIGH_LOAD_UNCERTAINTY_THRESHOLD:
            allocation_score += 0.25
            buses_needed += 1
            reasons.append(f"High uncertainty: ±{load_uncertainty:.2f} (safety buffer +1)")
        
        # 4. Poor vehicle health (<0.5): +0.3, +1 backup bus
        if vehicle_health < self.POOR_VEHICLE_HEALTH_THRESHOLD:
            allocation_score += 0.3
            buses_needed += 1
            reasons.append(f"Poor vehicle health: {vehicle_health:.2f} (backup +1)")
        
        # 5. Very high demand (>400): +0.2, +2 buses
        if demand > self.VERY_HIGH_DEMAND_THRESHOLD:
            allocation_score += 0.2
            buses_needed += 2
            reasons.append(f"Very high demand: {demand:.0f} (+2 buses)")
        elif demand > self.MODERATE_DEMAND_THRESHOLD:
            buses_needed += 1
            reasons.append(f"Moderate demand: {demand:.0f} (+1 bus)")
        
        # 6. Adverse weather (>0.6 risk): +0.15, +1 backup (breakdowns more likely)
        if weather_risk > self.ADVERSE_WEATHER_THRESHOLD:
            allocation_score += 0.15
            buses_needed += 1
            reasons.append(f"Adverse weather risk: {weather_risk:.2f} (backup +1)")
        
        # Constraint: Cap by available buses
        buses_needed = min(buses_needed, self.available_buses)
        
        # Clamp score
        allocation_score = max(0.0, min(1.0, allocation_score))
        
        # Determine action and priority
        action, priority = self._determine_action(allocation_score, buses_needed, reasons)
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'allocation_score': round(allocation_score, 3),
            'buses_needed': buses_needed,
            'action': action,
            'priority': priority,
            'reasons': reasons,
            'trust_weight': self.trust_weight,
            'route_id': route_id,
            'constraints': {
                'available_buses': self.available_buses,
                'capped': buses_needed >= self.available_buses
            }
        }
        
        # Post to blackboard
        if blackboard is not None:
            if 'fleet_allocation' not in blackboard:
                blackboard['fleet_allocation'] = {}
            blackboard['fleet_allocation'][route_id] = result
        
        return result
    
    def _determine_action(self, allocation_score: float, buses_needed: int, reasons: List[str]) -> tuple:
        """
        Determine action and priority based on allocation score.
        
        Thresholds (from specification):
        - Score > 0.6: "Allocate X Extra Bus(es)" (priority 7)
        - Score > 0.4: "Consider Allocating X Bus(es)" (priority 4)
        """
        if allocation_score > 0.6:
            action = f"Allocate {buses_needed} Extra Bus(es)" if buses_needed > 0 else "Maintain Fleet"
            return (action, 7)
        elif allocation_score > 0.4:
            action = f"Consider Allocating {buses_needed} Bus(es)" if buses_needed > 0 else "Monitor Fleet"
            return (action, 4)
        else:
            return ("Fleet Allocation Normal", 1)
