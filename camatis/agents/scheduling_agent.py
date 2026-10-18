"""
Agent 7: Scheduling Agent
Tactical Layer - Adjusts bus frequency based on demand, congestion, weather, and driver constraints
"""

import numpy as np
from typing import Dict, Any, List, Optional


class SchedulingAgent:
    """
    Determines optimal bus frequency by analyzing demand, uncertainty, utilization, delays, and safety.
    Enhanced with multi-factor scoring and dynamic frequency multipliers.
    """
    
    def __init__(self):
        self.name = "Scheduling Agent"
        self.layer = "Tactical"
        self.trust_weight = 0.9  # Tactical agent trust weight
        self.base_frequency = 4.0  # buses/hour (from spec: 15-min headway)
        
        # Thresholds from specification
        self.HIGH_DEMAND_THRESHOLD = 350
        self.CONGESTION_DELAY_THRESHOLD = 10  # minutes
        self.DRIVER_SAFETY_THRESHOLD = 0.5
        
    def adjust(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Determine frequency adjustments for a route.
        
        Inputs (from specification):
        - Demand + uncertainty
        - Utilization class
        - Congestion delay (from blackboard)
        - Weather delay (from blackboard)
        - Driver safety (from blackboard)
        - Temporal context
        
        Decision Process:
        Start with scheduling_score = 0.0, frequency_multiplier = 1.0
        - Overutilized + uncertainty: +0.4, 1.3× frequency
        - Underutilized: -0.2, 0.8× frequency
        - High demand (>350): +0.35, 1.4× frequency
        - Peak hour: +0.15, 1.1× multiplier
        - Congestion delay >10min: +0.2, 1.15× (more buses to compensate)
        - Severe weather: +0.15 BUT 0.9× frequency (safety reduction)
        - Driver safety concern (<0.5): +0.2 BUT 0.8× (reduce workload)
        
        Example: Base 4 buses/hour × 1.3 multiplier = 5.2 buses/hour = 11.5 min headway
        
        Args:
            route_data: Dictionary containing predictions and context
            blackboard: Shared blackboard for reading congestion/weather/driver data
            
        Returns:
            Dictionary with scheduling_score, action, priority, frequency_multiplier
        """
        # Extract inputs
        demand = route_data.get('passenger_demand', 0)
        demand_uncertainty = route_data.get('demand_std', 0)
        utilization_class = route_data.get('utilization_encoded', 1)  # 0=Under, 1=Normal, 2=Over
        is_peak = route_data.get('is_peak', 0)
        route_id = route_data.get('route_id', 'unknown')
        
        # Read from blackboard if available
        congestion_delay = 0
        weather_delay_mult = 1.0
        driver_safety = 1.0
        weather_frequency_mult = 1.0
        
        if blackboard:
            # Read congestion delay
            if 'congestion_monitoring' in blackboard:
                cong_data = blackboard['congestion_monitoring'].get(route_id, {})
                delays = cong_data.get('delays', {})
                congestion_delay = delays.get('delay_min', 0)
            
            # Read weather adjustments
            if 'weather_impact' in blackboard:
                weather_data = blackboard['weather_impact'].get(route_id, {})
                adjustments = weather_data.get('adjustments', {})
                weather_delay_mult = adjustments.get('delay_multiplier', 1.0)
                weather_frequency_mult = adjustments.get('frequency_multiplier', 1.0)
            
            # Read driver safety
            if 'driver_safety' in blackboard:
                driver_data = blackboard['driver_safety'].get(route_id, {})
                driver_safety = driver_data.get('safety_score', 1.0)
        
        # Start with zero scheduling score and 1.0 frequency multiplier
        scheduling_score = 0.0
        frequency_multiplier = 1.0
        reasons = []
        
        # Apply scheduling logic from specification
        
        # 1. Overutilized + uncertainty: +0.4, 1.3× frequency
        if utilization_class == 2:  # Overutilized
            if demand_uncertainty > 0.1:
                scheduling_score += 0.4
                frequency_multiplier *= 1.3
                reasons.append("Overutilized + uncertainty (1.3× frequency)")
            else:
                scheduling_score += 0.3
                frequency_multiplier *= 1.2
                reasons.append("Overutilized (1.2× frequency)")
        
        # 2. Underutilized: -0.2, 0.8× frequency
        elif utilization_class == 0:  # Underutilized
            scheduling_score -= 0.2
            frequency_multiplier *= 0.8
            reasons.append("Underutilized (0.8× frequency)")
        
        # 3. High demand (>350): +0.35, 1.4× frequency
        if demand > self.HIGH_DEMAND_THRESHOLD:
            scheduling_score += 0.35
            frequency_multiplier *= 1.4
            reasons.append(f"High demand: {demand:.0f} (1.4× frequency)")
        
        # 4. Peak hour: +0.15, 1.1× multiplier
        if is_peak:
            scheduling_score += 0.15
            frequency_multiplier *= 1.1
            reasons.append("Peak hour (1.1× frequency)")
        
        # 5. Congestion delay >10min: +0.2, 1.15× (more buses to compensate)
        if congestion_delay > self.CONGESTION_DELAY_THRESHOLD:
            scheduling_score += 0.2
            frequency_multiplier *= 1.15
            reasons.append(f"Congestion delay: {congestion_delay}min (1.15× to compensate)")
        
        # 6. Severe weather: +0.15 BUT 0.9× frequency (safety reduction)
        if weather_frequency_mult < 1.0:
            scheduling_score += 0.15
            frequency_multiplier *= weather_frequency_mult
            reasons.append(f"Severe weather ({weather_frequency_mult:.1f}× safety reduction)")
        
        # 7. Driver safety concern (<0.5): +0.2 BUT 0.8× (reduce workload)
        if driver_safety < self.DRIVER_SAFETY_THRESHOLD:
            scheduling_score += 0.2
            frequency_multiplier *= 0.8
            reasons.append(f"Driver safety concern: {driver_safety:.2f} (0.8× reduce workload)")
        
        # Clamp multiplier to reasonable range
        frequency_multiplier = max(0.5, min(2.0, frequency_multiplier))
        
        # Calculate actual frequency and headway
        actual_frequency = self.base_frequency * frequency_multiplier
        headway_minutes = 60.0 / actual_frequency
        
        # Determine action and priority
        action, priority = self._determine_action(scheduling_score, frequency_multiplier, reasons)
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'scheduling_score': round(scheduling_score, 3),
            'frequency_multiplier': round(frequency_multiplier, 2),
            'action': action,
            'priority': priority,
            'reasons': reasons,
            'trust_weight': self.trust_weight,
            'route_id': route_id,
            'frequency_details': {
                'base_frequency': self.base_frequency,
                'actual_frequency': round(actual_frequency, 2),
                'headway_minutes': round(headway_minutes, 1)
            }
        }
        
        # Post to blackboard
        if blackboard is not None:
            if 'scheduling_adjustment' not in blackboard:
                blackboard['scheduling_adjustment'] = {}
            blackboard['scheduling_adjustment'][route_id] = result
        
        return result
    
    def _determine_action(self, scheduling_score: float, frequency_multiplier: float, reasons: List[str]) -> tuple:
        """
        Determine action and priority based on scheduling score.
        
        Thresholds (from specification):
        - Score > 0.5: "Increase Frequency" (priority 6)
        - Score > 0.3: "Adjust Schedule" (priority 3)
        - Score < -0.1: "Reduce Frequency" (priority 2)
        """
        if scheduling_score > 0.5:
            return (f"Increase Frequency ({frequency_multiplier:.2f}×)", 6)
        elif scheduling_score > 0.3:
            return (f"Adjust Schedule ({frequency_multiplier:.2f}×)", 3)
        elif scheduling_score < -0.1:
            return (f"Reduce Frequency ({frequency_multiplier:.2f}×)", 2)
        else:
            return ("Schedule Normal", 1)
