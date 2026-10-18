"""
Agent 1: Driver Safety Agent
Operational Layer - Monitors driver behavior and enforces safety standards
"""

import numpy as np
from typing import Dict, Any, List, Optional


class DriverSafetyAgent:
    """
    Monitors 12 real-time driver behavior metrics and generates safety recommendations.
    Outputs safety scores, constraints, and priority-based actions.
    """
    
    def __init__(self):
        self.name = "Driver Safety Agent"
        self.layer = "Operational"
        self.trust_weight = 1.5  # High trust for safety-critical agent
        
        # Thresholds from specification
        self.SPEED_THRESHOLD = 80.0  # km/h
        self.HARSH_ACCEL_THRESHOLD = 3.0  # m/s²
        self.HARSH_BRAKE_THRESHOLD = 4.0  # bar
        self.SHARP_STEERING_THRESHOLD = 30.0  # degrees
        self.LANE_DEVIATION_THRESHOLD = 0.5  # meters
        self.SLOW_REACTION_THRESHOLD = 1.5  # seconds
        
    def evaluate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Evaluate driver safety for a route based on real-time metrics.
        
        Args:
            route_data: Dictionary containing driver behavior metrics
            blackboard: Shared blackboard for reading/writing observations
            
        Returns:
            Dictionary with safety_score, action, priority, constraints, and flags
        """
        # Extract driver metrics
        speed_kmph = route_data.get('speed_kmph', 0)
        accel_x = route_data.get('accel_x', 0)  # Longitudinal
        accel_y = route_data.get('accel_y', 0)  # Lateral
        brake_pressure = route_data.get('brake_pressure', 0)
        steering_angle = abs(route_data.get('steering_angle', 0))
        lane_deviation = abs(route_data.get('lane_deviation', 0))
        phone_usage = route_data.get('phone_usage', 0)
        reaction_time = route_data.get('reaction_time', 0)
        driver_class = route_data.get('driver_class', 'Safe')  # Safe/Aggressive/Distracted
        
        # Start with perfect safety score
        safety_score = 1.0
        violations = []
        
        # Apply penalties for violations (as per specification)
        
        # 1. Speeding (>80 km/h): up to -0.3
        if speed_kmph > self.SPEED_THRESHOLD:
            penalty = min(0.3, (speed_kmph - self.SPEED_THRESHOLD) / 100)
            safety_score -= penalty
            violations.append(f"Speeding: {speed_kmph:.1f} km/h")
        
        # 2. Phone usage: -0.3 (critical)
        if phone_usage > 0 or phone_usage == 1.0:
            safety_score -= 0.3
            violations.append("Phone usage detected (CRITICAL)")
        
        # 3. Harsh braking/acceleration: -0.2 each
        accel_magnitude = np.sqrt(accel_x**2 + accel_y**2)
        if accel_magnitude > self.HARSH_ACCEL_THRESHOLD:
            safety_score -= 0.2
            violations.append(f"Harsh acceleration: {accel_magnitude:.2f} m/s²")
            
        if brake_pressure > self.HARSH_BRAKE_THRESHOLD:
            safety_score -= 0.2
            violations.append(f"Harsh braking: {brake_pressure:.1f} bar")
        
        # 4. Erratic steering (>30°): -0.15
        if steering_angle > self.SHARP_STEERING_THRESHOLD:
            safety_score -= 0.15
            violations.append(f"Sharp steering: {steering_angle:.1f}°")
        
        # 5. Lane deviation (>0.5m): -0.15
        if lane_deviation > self.LANE_DEVIATION_THRESHOLD:
            safety_score -= 0.15
            violations.append(f"Lane deviation: {lane_deviation:.2f} m")
        
        # 6. Slow reaction (>1.5s): -0.1
        if reaction_time > self.SLOW_REACTION_THRESHOLD:
            safety_score -= 0.1
            violations.append(f"Slow reaction: {reaction_time:.2f} s")
        
        # 7. Driver class penalties
        if driver_class == 'Aggressive':
            safety_score -= 0.2
            violations.append("Aggressive driver profile")
        elif driver_class == 'Distracted':
            safety_score -= 0.25
            violations.append("Distracted driver profile")
        
        # Clamp score to [0, 1]
        safety_score = max(0.0, min(1.0, safety_score))
        
        # Determine action and priority based on thresholds
        action, priority, constraints = self._determine_action(safety_score, violations)
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'safety_score': round(safety_score, 3),
            'action': action,
            'priority': priority,
            'constraints': constraints,
            'violations': violations,
            'trust_weight': self.trust_weight,
            'emergency': safety_score < 0.3,  # Flag for supervisor
            'route_id': route_data.get('route_id', 'unknown')
        }
        
        # Post to blackboard if available
        if blackboard is not None:
            if 'driver_safety' not in blackboard:
                blackboard['driver_safety'] = {}
            blackboard['driver_safety'][route_data.get('route_id', 'unknown')] = result
        
        return result
    
    def _determine_action(self, safety_score: float, violations: List[str]) -> tuple:
        """
        Determine action, priority, and constraints based on safety score.
        
        Thresholds (from specification):
        - Score < 0.3: "Replace Driver Immediately" (priority 10) + max_frequency 50%
        - Score < 0.5: "Schedule Driver Break" (priority 7) + max_frequency 80%
        - Score < 0.7: "Monitor Driver Closely" (priority 4)
        """
        if safety_score < 0.3:
            return (
                "Replace Driver Immediately",
                10,  # Highest priority
                {
                    'max_frequency_multiplier': 0.5,  # 50% of normal
                    'driver_replacement_required': True,
                    'immediate_action': True
                }
            )
        elif safety_score < 0.5:
            return (
                "Schedule Driver Break",
                7,
                {
                    'max_frequency_multiplier': 0.8,  # 80% of normal
                    'driver_break_required': True,
                    'monitoring_level': 'high'
                }
            )
        elif safety_score < 0.7:
            return (
                "Monitor Driver Closely",
                4,
                {
                    'monitoring_level': 'elevated',
                    'alert_threshold': 'medium'
                }
            )
        else:
            return (
                "Driver Safety Normal",
                1,
                {
                    'monitoring_level': 'standard'
                }
            )
    
    def batch_evaluate(self, routes_data: List[Dict[str, Any]], blackboard: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Evaluate safety for multiple routes in batch.
        """
        results = []
        for route_data in routes_data:
            result = self.evaluate(route_data, blackboard)
            results.append(result)
        return results
