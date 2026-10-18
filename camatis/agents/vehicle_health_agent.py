"""
Agent 2: Vehicle Health Agent
Operational Layer - Monitors vehicle efficiency and maintenance needs
"""

import numpy as np
from typing import Dict, Any, List, Optional


class VehicleHealthAgent:
    """
    Monitors 7 vehicle efficiency metrics and generates maintenance recommendations.
    Outputs health scores, constraints, and priority-based actions.
    """
    
    def __init__(self):
        self.name = "Vehicle Health Agent"
        self.layer = "Operational"
        self.trust_weight = 1.3  # High trust for safety-critical agent
        
        # Baseline values from specification
        self.BASELINE_FUEL_EFFICIENCY = 8.0  # L/km
        self.FUEL_THRESHOLD_30PCT = 10.4  # 30% worse than baseline
        self.BRAKE_WEAR_THRESHOLD = 0.8
        self.IDLE_TIME_THRESHOLD = 0.3  # 30%
        self.VEHICLE_OVERLOAD_THRESHOLD = 18000  # kg
        self.AC_USAGE_THRESHOLD = 0.8  # 80%
        self.THROTTLE_HIGH_THRESHOLD = 0.9
        
    def evaluate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Evaluate vehicle health for a route based on efficiency metrics.
        
        Args:
            route_data: Dictionary containing vehicle efficiency metrics
            blackboard: Shared blackboard for reading/writing observations
            
        Returns:
            Dictionary with health_score, action, priority, constraints, and flags
        """
        # Extract vehicle metrics
        fuel_per_km = route_data.get('fuel_per_km', self.BASELINE_FUEL_EFFICIENCY)
        brake_usage = route_data.get('brake_usage', 0)
        stop_ptime = route_data.get('stop_ptime', 0)  # Idle time percentage
        mass = route_data.get('mass', 15000)
        aircond_ptime = route_data.get('aircond_ptime', 0)  # AC usage
        throttle = route_data.get('throttle', 0)
        
        # Start with perfect health score
        health_score = 1.0
        issues = []
        
        # Apply degradation penalties (as per specification)
        
        # 1. Fuel efficiency 30% worse than baseline (8.0 L/km): -0.3
        if fuel_per_km > self.FUEL_THRESHOLD_30PCT:
            penalty = 0.3
            health_score -= penalty
            issues.append(f"Poor fuel efficiency: {fuel_per_km:.2f} L/km (baseline: {self.BASELINE_FUEL_EFFICIENCY})")
        
        # 2. Excessive brake wear (>0.8): -0.25
        if brake_usage > self.BRAKE_WEAR_THRESHOLD:
            health_score -= 0.25
            issues.append(f"Excessive brake wear: {brake_usage:.2f}")
        
        # 3. High idle time (>30%): -0.15
        if stop_ptime > self.IDLE_TIME_THRESHOLD:
            health_score -= 0.15
            issues.append(f"High idle time: {stop_ptime*100:.1f}%")
        
        # 4. Vehicle overloaded (>18,000 kg): -0.2
        if mass > self.VEHICLE_OVERLOAD_THRESHOLD:
            health_score -= 0.2
            issues.append(f"Vehicle overloaded: {mass:.0f} kg")
        
        # 5. High AC usage (>80%): -0.1
        if aircond_ptime > self.AC_USAGE_THRESHOLD:
            health_score -= 0.1
            issues.append(f"High AC usage: {aircond_ptime*100:.1f}% (15% fuel penalty)")
        
        # 6. Constant high throttle (>0.9): -0.1
        if throttle > self.THROTTLE_HIGH_THRESHOLD:
            health_score -= 0.1
            issues.append(f"Aggressive throttle: {throttle:.2f}")
        
        # Clamp score to [0, 1]
        health_score = max(0.0, min(1.0, health_score))
        
        # Determine action and priority based on thresholds
        action, priority, constraints = self._determine_action(health_score, issues)
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'health_score': round(health_score, 3),
            'action': action,
            'priority': priority,
            'constraints': constraints,
            'issues': issues,
            'trust_weight': self.trust_weight,
            'emergency': health_score < 0.3,  # Flag for supervisor
            'route_id': route_data.get('route_id', 'unknown'),
            'bus_id': route_data.get('bus_id', 'unknown')
        }
        
        # Post to blackboard if available
        if blackboard is not None:
            if 'vehicle_health' not in blackboard:
                blackboard['vehicle_health'] = {}
            blackboard['vehicle_health'][route_data.get('route_id', 'unknown')] = result
        
        return result
    
    def _determine_action(self, health_score: float, issues: List[str]) -> tuple:
        """
        Determine action, priority, and constraints based on health score.
        
        Thresholds (from specification):
        - Score < 0.3: "Remove Vehicle for Maintenance" (priority 9) + max_load 0
        - Score < 0.5: "Schedule Immediate Maintenance" (priority 6) + max_load 0.6
        - Score < 0.7: "Schedule Preventive Maintenance" (priority 3)
        """
        if health_score < 0.3:
            return (
                "Remove Vehicle for Maintenance",
                9,  # Very high priority
                {
                    'max_load_factor': 0.0,  # Don't use this vehicle
                    'vehicle_removal_required': True,
                    'backup_bus_needed': True,
                    'immediate_action': True
                }
            )
        elif health_score < 0.5:
            return (
                "Schedule Immediate Maintenance",
                6,
                {
                    'max_load_factor': 0.6,  # Reduced capacity
                    'maintenance_priority': 'high',
                    'backup_bus_recommended': True
                }
            )
        elif health_score < 0.7:
            return (
                "Schedule Preventive Maintenance",
                3,
                {
                    'maintenance_priority': 'medium',
                    'monitoring_level': 'elevated'
                }
            )
        else:
            return (
                "Vehicle Health Normal",
                1,
                {
                    'monitoring_level': 'standard'
                }
            )
    
    def batch_evaluate(self, routes_data: List[Dict[str, Any]], blackboard: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Evaluate vehicle health for multiple routes in batch.
        """
        results = []
        for route_data in routes_data:
            result = self.evaluate(route_data, blackboard)
            results.append(result)
        return results
