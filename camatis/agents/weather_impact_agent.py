"""
Agent 3: Weather Impact Agent
Operational Layer - Monitors weather conditions and assesses operational risk
"""

import numpy as np
from typing import Dict, Any, List, Optional


class WeatherImpactAgent:
    """
    Monitors 7 weather metrics and generates risk assessments.
    Outputs risk scores, service adjustments, and cascading effects.
    """
    
    def __init__(self):
        self.name = "Weather Impact Agent"
        self.layer = "Operational"
        self.trust_weight = 1.3  # High trust for safety-critical agent
        
        # Thresholds from specification
        self.EXTREME_HEAT = 40.0  # °C
        self.EXTREME_COLD = 0.0  # °C
        self.HEAVY_PRECIPITATION = 10.0  # mm
        self.HEAVY_RAIN = 10.0  # mm
        self.SNOWFALL_THRESHOLD = 2.0  # mm
        self.SEVERE_WIND_GUST = 60.0  # km/h
        self.HIGH_WIND = 40.0  # km/h
        
    def evaluate(self, route_data: Dict[str, Any], blackboard: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Evaluate weather impact for a route based on current conditions.
        
        Args:
            route_data: Dictionary containing weather metrics
            blackboard: Shared blackboard for reading/writing observations
            
        Returns:
            Dictionary with risk_score, action, priority, adjustments, and cascading effects
        """
        # Extract weather metrics
        temp_max = route_data.get('temp_max', 25.0)
        temp_min = route_data.get('temp_min', 15.0)
        precipitation = route_data.get('precipitation', 0.0)
        rain = route_data.get('rain', 0.0)
        snowfall = route_data.get('snowfall', 0.0)
        wind_speed_max = route_data.get('wind_speed_max', 0.0)
        wind_gust_max = route_data.get('wind_gust_max', 0.0)
        
        # Start with zero risk
        risk_score = 0.0
        conditions = []
        
        # Add risk for adverse conditions (as per specification)
        
        # 1. Extreme heat (>40°C): +0.3 per 20°C above
        if temp_max > self.EXTREME_HEAT:
            risk_increment = 0.3 * ((temp_max - self.EXTREME_HEAT) / 20.0)
            risk_score += risk_increment
            conditions.append(f"Extreme heat: {temp_max:.1f}°C")
        
        # 2. Extreme cold (<0°C): +0.3 per 10°C below
        if temp_min < self.EXTREME_COLD:
            risk_increment = 0.3 * (abs(temp_min) / 10.0)
            risk_score += risk_increment
            conditions.append(f"Extreme cold: {temp_min:.1f}°C")
        
        # 3. Heavy precipitation (>10mm): +0.3
        if precipitation > self.HEAVY_PRECIPITATION:
            risk_score += 0.3
            conditions.append(f"Heavy precipitation: {precipitation:.1f} mm")
        
        # 4. Heavy rain (>10mm): +0.25
        if rain > self.HEAVY_RAIN:
            risk_score += 0.25
            conditions.append(f"Heavy rain: {rain:.1f} mm")
        
        # 5. Snowfall (>2mm): +0.4 (highest impact)
        if snowfall > self.SNOWFALL_THRESHOLD:
            risk_score += 0.4
            conditions.append(f"Snowfall: {snowfall:.1f} mm (CRITICAL)")
        
        # 6. Severe wind gusts (>60 km/h): +0.35
        if wind_gust_max > self.SEVERE_WIND_GUST:
            risk_score += 0.35
            conditions.append(f"Severe wind gusts: {wind_gust_max:.1f} km/h")
        
        # 7. High winds (>40 km/h): +0.2
        elif wind_speed_max > self.HIGH_WIND:
            risk_score += 0.2
            conditions.append(f"High winds: {wind_speed_max:.1f} km/h")
        
        # Clamp risk to [0, 1]
        risk_score = min(1.0, risk_score)
        
        # Determine action, priority, and adjustments based on thresholds
        action, priority, adjustments = self._determine_action(risk_score, conditions)
        
        # Calculate cascading effects
        cascading_effects = self._calculate_cascading_effects(risk_score)
        
        # Prepare output
        result = {
            'agent': self.name,
            'layer': self.layer,
            'risk_score': round(risk_score, 3),
            'action': action,
            'priority': priority,
            'adjustments': adjustments,
            'conditions': conditions,
            'cascading_effects': cascading_effects,
            'trust_weight': self.trust_weight,
            'emergency': risk_score > 0.7,  # Flag for supervisor
            'route_id': route_data.get('route_id', 'unknown')
        }
        
        # Post to blackboard if available
        if blackboard is not None:
            if 'weather_impact' not in blackboard:
                blackboard['weather_impact'] = {}
            blackboard['weather_impact'][route_data.get('route_id', 'unknown')] = result
        
        return result
    
    def _determine_action(self, risk_score: float, conditions: List[str]) -> tuple:
        """
        Determine action, priority, and adjustments based on risk score.
        
        Thresholds (from specification):
        - Risk > 0.7: "Reduce Service - Severe Weather" (priority 9) + 1.5× delay + 60% frequency
        - Risk > 0.5: "Adjust Service - Adverse Weather" (priority 6) + 1.3× delay + 80% frequency
        - Risk > 0.3: "Monitor Weather Closely" (priority 3) + 1.15× delay + 95% frequency
        """
        if risk_score > 0.7:
            return (
                "Reduce Service - Severe Weather",
                9,  # Very high priority
                {
                    'delay_multiplier': 1.5,
                    'frequency_multiplier': 0.6,  # 60% of normal
                    'service_level': 'critical',
                    'safety_first': True
                }
            )
        elif risk_score > 0.5:
            return (
                "Adjust Service - Adverse Weather",
                6,
                {
                    'delay_multiplier': 1.3,
                    'frequency_multiplier': 0.8,  # 80% of normal
                    'service_level': 'reduced',
                    'monitoring_level': 'high'
                }
            )
        elif risk_score > 0.3:
            return (
                "Monitor Weather Closely",
                3,
                {
                    'delay_multiplier': 1.15,
                    'frequency_multiplier': 0.95,  # 95% of normal
                    'service_level': 'normal',
                    'monitoring_level': 'elevated'
                }
            )
        else:
            return (
                "Weather Conditions Normal",
                1,
                {
                    'delay_multiplier': 1.0,
                    'frequency_multiplier': 1.0,
                    'service_level': 'normal'
                }
            )
    
    def _calculate_cascading_effects(self, risk_score: float) -> Dict[str, Any]:
        """
        Calculate cascading effects on other agents (from specification):
        - Demand Agent: reduces forecast 10% (people stay home)
        - Scheduling Agent: adjusts headway (15 min → 19.5 min for 1.3× delay)
        - Fleet Agent: allocates +1 backup bus (weather risk > 0.5)
        """
        effects = {
            'demand_reduction': 0.0,
            'headway_adjustment': 1.0,
            'backup_buses_needed': 0
        }
        
        if risk_score > 0.5:
            # Severe/adverse weather
            effects['demand_reduction'] = 0.10  # 10% reduction
            effects['headway_adjustment'] = 1.3  # 15 min → 19.5 min
            effects['backup_buses_needed'] = 1
        elif risk_score > 0.3:
            # Moderate weather
            effects['demand_reduction'] = 0.05  # 5% reduction
            effects['headway_adjustment'] = 1.15  # 15 min → 17.25 min
            effects['backup_buses_needed'] = 0
        
        return effects
    
    def batch_evaluate(self, routes_data: List[Dict[str, Any]], blackboard: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Evaluate weather impact for multiple routes in batch.
        """
        results = []
        for route_data in routes_data:
            result = self.evaluate(route_data, blackboard)
            results.append(result)
        return results
