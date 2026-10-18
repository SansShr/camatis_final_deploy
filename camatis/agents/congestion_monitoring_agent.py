"""
Agent 4: Congestion Monitoring Agent
Operational Layer - Monitors traffic conditions and recommends routing adjustments
"""

import numpy as np
from typing import Dict, Any, List, Optional


class CongestionMonitoringAgent:
    """
    Monitors 6 traffic metrics and generates routing recommendations.
    Outputs congestion scores, delay estimates, and rerouting suggestions.
    """
    
    def __init__(self):
        self.name = "Congestion Monitoring Agent"
        self.layer = "Operational"
        self.trust_weight = 1.2  # High trust for operational agent
        
        # Thresholds from specification
        self.HIGH_CONGESTION_LEVEL = 0.7
        self.SEVERE_SRI = 0.6  # Speed Reduction Index (40% slower)
        self.VERY_SLOW_SPEED = 0.5  # 50% of expected speed
        self.CHRONIC_CONGESTION = 0.6  # Historical average
        
    def evaluate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Evaluate congestion for a route based on traffic metrics.
        
        Args:
            route_data: Dictionary containing traffic and speed metrics
            blackboard: Shared blackboard for reading/writing observations
            
        Returns:
            Dictionary with congestion_score, action, priority, delays, and rerouting flags
        """
        # Extract traffic metrics
        congestion_level = route_data.get('congestion_level', 0.0)
        sri = route_data.get('SRI', 1.0)  # Speed Reduction Index
        speed_normalized = route_data.get('speed', 1.0)
        route_avg_congestion = route_data.get('route_avg_congestion', 0.0)
        speed_congestion_ratio = route_data.get('speed_congestion_ratio', 1.0)
        
        # Start with zero congestion score
        congestion_score = 0.0
        indicators = []
        
        # Add congestion indicators (as per specification)
        
        # 1. High congestion level (>0.7): +0.4
        if congestion_level > self.HIGH_CONGESTION_LEVEL:
            congestion_score += 0.4
            indicators.append(f"High congestion level: {congestion_level:.2f}")
        
        # 2. Severe speed reduction (SRI < 0.6): +0.3 (40% slower than expected)
        if sri < self.SEVERE_SRI:
            congestion_score += 0.3
            percent_slower = (1.0 - sri) * 100
            indicators.append(f"Severe speed reduction: {percent_slower:.1f}% slower")
        
        # 3. Very slow actual speed (<50% expected): +0.2
        if speed_normalized < self.VERY_SLOW_SPEED:
            congestion_score += 0.2
            indicators.append(f"Very slow speed: {speed_normalized*100:.1f}% of normal")
        
        # 4. Chronically congested route (historical >0.6): +0.1
        if route_avg_congestion > self.CHRONIC_CONGESTION:
            congestion_score += 0.1
            indicators.append(f"Chronically congested route: avg {route_avg_congestion:.2f}")
        
        # Clamp score to [0, 1]
        congestion_score = min(1.0, congestion_score)
        
        # Determine action, priority, and delays based on thresholds
        action, priority, delays, reroute_flag = self._determine_action(
            congestion_score, indicators
        )
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'congestion_score': round(congestion_score, 3),
            'action': action,
            'priority': priority,
            'delays': delays,
            'reroute_recommended': reroute_flag,
            'indicators': indicators,
            'trust_weight': self.trust_weight,
            'high_severity': congestion_score > 0.7,
            'route_id': route_data.get('route_id', 'unknown')
        }
        
        # Post to blackboard if available
        if blackboard is not None:
            if 'congestion_monitoring' not in blackboard:
                blackboard['congestion_monitoring'] = {}
            blackboard['congestion_monitoring'][route_data.get('route_id', 'unknown')] = result
        
        return result
    
    def _determine_action(self, congestion_score: float, indicators: List[str]) -> tuple:
        """
        Determine action, priority, delays, and rerouting flag based on congestion score.
        
        Thresholds (from specification):
        - Score > 0.7: "Suggest Alternate Route" (priority 8) + 20-70 min delay + reroute
        - Score > 0.5: "Increase Headway Due to Congestion" (priority 5) + 10-35 min delay
        - Score > 0.3: "Monitor Traffic Conditions" (priority 2) + 5-20 min delay
        """
        if congestion_score > 0.7:
            # Severe congestion
            delay_min = 20 + int(congestion_score * 50)  # 20-70 min range
            delay_max = delay_min + 15
            return (
                "Suggest Alternate Route",
                8,  # High priority
                {
                    'delay_min': delay_min,
                    'delay_max': delay_max,
                    'congestion_level': 'severe'
                },
                True  # Rerouting recommended
            )
        elif congestion_score > 0.5:
            # Moderate congestion
            delay_min = 10 + int(congestion_score * 25)  # 10-35 min range
            delay_max = delay_min + 10
            return (
                "Increase Headway Due to Congestion",
                5,
                {
                    'delay_min': delay_min,
                    'delay_max': delay_max,
                    'congestion_level': 'moderate',
                    'headway_increase': 1.2  # 20% increase
                },
                False
            )
        elif congestion_score > 0.3:
            # Light congestion
            delay_min = 5 + int(congestion_score * 15)  # 5-20 min range
            delay_max = delay_min + 5
            return (
                "Monitor Traffic Conditions",
                2,
                {
                    'delay_min': delay_min,
                    'delay_max': delay_max,
                    'congestion_level': 'light'
                },
                False
            )
        else:
            # Normal conditions
            return (
                "Traffic Conditions Normal",
                1,
                {
                    'delay_min': 0,
                    'delay_max': 5,
                    'congestion_level': 'normal'
                },
                False
            )
    
    def batch_evaluate(self, routes_data: List[Dict[str, Any]], blackboard: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Evaluate congestion for multiple routes in batch.
        """
        results = []
        for route_data in routes_data:
            result = self.evaluate(route_data, blackboard)
            results.append(result)
        return results
