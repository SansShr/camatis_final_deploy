"""
Agent 5: Demand Agent  
Tactical Layer - Evaluates demand patterns and triggers resource allocation
"""

import numpy as np
from typing import Dict, Any, List, Optional


class DemandAgent:
    """
    Monitors demand predictions and utilization to trigger resource allocation.
    Enhanced with weather integration, uncertainty buffers, and temporal context.
    """
    
    def __init__(self):
        self.name = "Demand Agent"
        self.layer = "Tactical"
        self.trust_weight = 1.0  # Standard trust for tactical agents
        
        # Thresholds from specification
        self.HIGH_LOAD_THRESHOLD = 0.65
        self.CRITICAL_LOAD_THRESHOLD = 0.8
        self.HIGH_DEMAND_THRESHOLD = 350
        self.HIGH_DEMAND_PROB_THRESHOLD = 0.75
        self.HIGH_UNCERTAINTY_THRESHOLD = 0.15
        
    def evaluate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Evaluate demand risk for a route.
        
        Inputs (from specification):
        - ML predictions (demand, load, utilization probability)
        - Temporal context (is_peak)
        - Weather risk (from blackboard)
        
        Decision Process:
        Start with demand_score = 0.0
        - High current load (>0.65): +0.4, Critical (>0.8): +0.3 more
        - High predicted demand (>350 & prob >0.75): +0.35
        - High uncertainty (>0.15): +0.15 (allocate buffer)
        - Peak hour: +0.15
        - Moderate weather risk: +0.05 (people rush before storm)
        - Severe weather risk: -0.1 (people stay home)
        
        Args:
            route_data: Dictionary containing ML predictions and context
            blackboard: Shared blackboard for reading weather/temporal data
            
        Returns:
            Dictionary with demand_score, action, priority, and flags
        """
        # Extract inputs
        demand = route_data.get('passenger_demand', 0)
        load = route_data.get('load_factor', 0)
        demand_uncertainty = route_data.get('demand_std', 0)
        prob_overutilized = route_data.get('prob_overutilized', 0)
        is_peak = route_data.get('is_peak', 0)
        
        # Read weather risk from blackboard if available
        weather_risk = 0.0
        if blackboard and 'weather_impact' in blackboard:
            route_id = route_data.get('route_id', 'unknown')
            weather_data = blackboard['weather_impact'].get(route_id, {})
            weather_risk = weather_data.get('risk_score', 0.0)
        
        # Start with zero demand score
        demand_score = 0.0
        indicators = []
        
        # Apply scoring logic from specification
        
        # 1. High current load (>0.65): +0.4, Critical (>0.8): +0.3 more
        if load > self.CRITICAL_LOAD_THRESHOLD:
            demand_score += 0.7  # 0.4 + 0.3
            indicators.append(f"Critical load: {load:.2f}")
        elif load > self.HIGH_LOAD_THRESHOLD:
            demand_score += 0.4
            indicators.append(f"High load: {load:.2f}")
        
        # 2. High predicted demand (>350 & prob >0.75): +0.35
        if demand > self.HIGH_DEMAND_THRESHOLD and prob_overutilized > self.HIGH_DEMAND_PROB_THRESHOLD:
            demand_score += 0.35
            indicators.append(f"High demand forecast: {demand:.0f} passengers, {prob_overutilized:.2f} prob")
        
        # 3. High uncertainty (>0.15): +0.15 (allocate buffer)
        if demand_uncertainty > self.HIGH_UNCERTAINTY_THRESHOLD:
            demand_score += 0.15
            indicators.append(f"High uncertainty: ±{demand_uncertainty:.2f}")
        
        # 4. Peak hour: +0.15
        if is_peak:
            demand_score += 0.15
            indicators.append("Peak hour")
        
        # 5. Weather effects
        if 0.3 < weather_risk <= 0.5:
            # Moderate weather risk: +0.05 (people rush before storm)
            demand_score += 0.05
            indicators.append("Weather: people rushing before storm")
        elif weather_risk > 0.5:
            # Severe weather risk: -0.1 (people stay home)
            demand_score -= 0.1
            indicators.append("Weather: demand suppressed (people stay home)")
        
        # Clamp score
        demand_score = max(0.0, min(1.0, demand_score))
        
        # Determine action and priority
        action, priority = self._determine_action(demand_score, indicators)
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'demand_score': round(demand_score, 3),
            'action': action,
            'priority': priority,
            'indicators': indicators,
            'trust_weight': self.trust_weight,
            'route_id': route_data.get('route_id', 'unknown'),
            'outputs_to': ['Fleet Agent', 'Scheduling Agent']
        }
        
        # Post to blackboard
        if blackboard is not None:
            if 'demand_assessment' not in blackboard:
                blackboard['demand_assessment'] = {}
            blackboard['demand_assessment'][route_data.get('route_id', 'unknown')] = result
        
        return result
    
    def _determine_action(self, demand_score: float, indicators: List[str]) -> tuple:
        """
        Determine action and priority based on demand score.
        
        Thresholds (from specification):
        - Score > 0.7: "High Demand Risk" (priority 8)
        - Score > 0.5: "Elevated Demand" (priority 5)
        - Score > 0.3: "Monitor Demand" (priority 2)
        
        Output To: Fleet Agent (triggers bus allocation), Scheduling Agent (influences frequency)
        """
        if demand_score > 0.7:
            return ("High Demand Risk", 8)
        elif demand_score > 0.5:
            return ("Elevated Demand", 5)
        elif demand_score > 0.3:
            return ("Monitor Demand", 2)
        else:
            return ("Demand Normal", 1)
