"""
Blackboard Communication System
Shared memory for asynchronous agent coordination

From specification:
- Blackboard System: Shared memory, agents post/read observations asynchronously
- Message Broker: Direct agent-to-agent urgent signals
- System State: Continuously updated with latest predictions, route IDs, timestamps
"""

import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from threading import Lock


class Blackboard:
    """
    Centralized shared memory system for agent coordination.
    
    Features:
    - Namespace-based organization (driver_safety, vehicle_health, weather_impact, etc.)
    - Asynchronous posting and reading
    - Timestamped observations
    - Thread-safe operations
    - System state tracking
    - Message broker for urgent communications
    """
    
    def __init__(self):
        # Main blackboard storage organized by namespaces
        self._data = {
            # Operational Layer namespaces
            'driver_safety': {},
            'vehicle_health': {},
            'weather_impact': {},
            'congestion_monitoring': {},
            
            # Tactical Layer namespaces
            'demand_assessment': {},
            'fleet_allocation': {},
            'scheduling_adjustment': {},
            'route_optimization': {},
            
            # Strategic Layer namespace
            'supervisor_decisions': {},
            
            # System state
            'system_state': {
                'last_update': None,
                'active_routes': [],
                'total_buses_allocated': 0,
                'global_metrics': {}
            },
            
            # Message broker for urgent signals
            'urgent_messages': []
        }
        
        # Thread lock for concurrent access
        self._lock = Lock()
        
        # History tracking (last N updates per namespace)
        self._history_size = 10
        self._history = {}
    
    def post(self, namespace: str, route_id: str, data: Dict[str, Any], urgent: bool = False) -> bool:
        """
        Post observation to blackboard namespace.
        
        Args:
            namespace: Target namespace (e.g., 'driver_safety', 'demand_assessment')
            route_id: Route identifier
            data: Observation data to post
            urgent: If True, also send via message broker
            
        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                # Ensure namespace exists
                if namespace not in self._data:
                    self._data[namespace] = {}
                
                # Add timestamp if not present
                if 'timestamp' not in data:
                    data['timestamp'] = datetime.now().isoformat()
                
                # Post to namespace
                self._data[namespace][route_id] = data
                
                # Track in history
                self._track_history(namespace, route_id, data)
                
                # If urgent, also post to message broker
                if urgent:
                    self._post_urgent_message(namespace, route_id, data)
                
                # Update system state
                self._update_system_state()
                
                return True
                
            except Exception as e:
                print(f"[Blackboard] Error posting to {namespace}/{route_id}: {e}")
                return False
    
    def read(self, namespace: str, route_id: Optional[str] = None) -> Optional[Any]:
        """
        Read observation from blackboard namespace.
        
        Args:
            namespace: Source namespace
            route_id: Specific route ID (if None, returns entire namespace)
            
        Returns:
            Observation data or None if not found
        """
        with self._lock:
            try:
                if namespace not in self._data:
                    return None
                
                if route_id is None:
                    # Return entire namespace
                    return self._data[namespace].copy()
                else:
                    # Return specific route data
                    return self._data[namespace].get(route_id, None)
                    
            except Exception as e:
                print(f"[Blackboard] Error reading from {namespace}/{route_id}: {e}")
                return None
    
    def read_all_namespaces(self, route_id: str) -> Dict[str, Any]:
        """
        Read all namespace observations for a specific route.
        
        Useful for agents that need cross-namespace information.
        
        Args:
            route_id: Route identifier
            
        Returns:
            Dictionary mapping namespace to observation
        """
        with self._lock:
            result = {}
            for namespace, routes_data in self._data.items():
                if namespace in ['system_state', 'urgent_messages']:
                    continue  # Skip system namespaces
                
                if isinstance(routes_data, dict) and route_id in routes_data:
                    result[namespace] = routes_data[route_id].copy()
            
            return result
    
    def get_system_state(self) -> Dict[str, Any]:
        """
        Get current system state.
        
        Returns:
            System state dictionary
        """
        with self._lock:
            return self._data['system_state'].copy()
    
    def get_urgent_messages(self, clear: bool = True) -> List[Dict[str, Any]]:
        """
        Get urgent messages from message broker.
        
        Args:
            clear: If True, clear messages after reading
            
        Returns:
            List of urgent messages
        """
        with self._lock:
            messages = self._data['urgent_messages'].copy()
            if clear:
                self._data['urgent_messages'] = []
            return messages
    
    def get_history(self, namespace: str, route_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get historical observations for a namespace/route.
        
        Args:
            namespace: Source namespace
            route_id: Route identifier
            limit: Maximum number of historical entries
            
        Returns:
            List of historical observations (most recent first)
        """
        with self._lock:
            key = f"{namespace}/{route_id}"
            history = self._history.get(key, [])
            return history[:limit]
    
    def clear_namespace(self, namespace: str):
        """Clear all data in a namespace."""
        with self._lock:
            if namespace in self._data:
                self._data[namespace] = {}
    
    def clear_all(self):
        """Clear all data from blackboard (except system_state)."""
        with self._lock:
            for namespace in self._data.keys():
                if namespace != 'system_state':
                    self._data[namespace] = {}
            
            self._data['urgent_messages'] = []
            self._history = {}
    
    def get_namespace_summary(self, namespace: str) -> Dict[str, Any]:
        """
        Get summary statistics for a namespace.
        
        Args:
            namespace: Target namespace
            
        Returns:
            Dictionary with count, routes, last_update
        """
        with self._lock:
            if namespace not in self._data:
                return {'count': 0, 'routes': [], 'last_update': None}
            
            data = self._data[namespace]
            if not isinstance(data, dict):
                return {'count': 0, 'routes': [], 'last_update': None}
            
            routes = list(data.keys())
            timestamps = [
                v.get('timestamp') for v in data.values() 
                if isinstance(v, dict) and 'timestamp' in v
            ]
            last_update = max(timestamps) if timestamps else None
            
            return {
                'count': len(routes),
                'routes': routes,
                'last_update': last_update
            }
    
    def get_full_state(self) -> Dict[str, Any]:
        """
        Get complete blackboard state for debugging/monitoring.
        
        Returns:
            Full blackboard state
        """
        with self._lock:
            return {
                'data': {k: v.copy() if isinstance(v, dict) else v 
                        for k, v in self._data.items()},
                'namespaces': list(self._data.keys()),
                'timestamp': datetime.now().isoformat()
            }
    
    def _post_urgent_message(self, namespace: str, route_id: str, data: Dict[str, Any]):
        """Post urgent message to message broker (internal)."""
        message = {
            'namespace': namespace,
            'route_id': route_id,
            'agent': data.get('agent', 'Unknown'),
            'action': data.get('action', 'Unknown'),
            'priority': data.get('priority', 0),
            'emergency': data.get('emergency', False),
            'timestamp': datetime.now().isoformat()
        }
        self._data['urgent_messages'].append(message)
        
        # Keep only last 50 urgent messages
        if len(self._data['urgent_messages']) > 50:
            self._data['urgent_messages'] = self._data['urgent_messages'][-50:]
    
    def _track_history(self, namespace: str, route_id: str, data: Dict[str, Any]):
        """Track observation in history (internal)."""
        key = f"{namespace}/{route_id}"
        if key not in self._history:
            self._history[key] = []
        
        # Add to history
        self._history[key].insert(0, data.copy())
        
        # Keep only last N entries
        if len(self._history[key]) > self._history_size:
            self._history[key] = self._history[key][:self._history_size]
    
    def _update_system_state(self):
        """Update system state with latest statistics (internal)."""
        try:
            active_routes = set()
            total_buses = 0
            
            # Collect active routes from all namespaces
            for namespace, routes_data in self._data.items():
                if namespace in ['system_state', 'urgent_messages']:
                    continue
                
                if isinstance(routes_data, dict):
                    active_routes.update(routes_data.keys())
            
            # Calculate total buses allocated
            if 'fleet_allocation' in self._data:
                for route_id, allocation in self._data['fleet_allocation'].items():
                    if isinstance(allocation, dict):
                        total_buses += allocation.get('buses_needed', 0)
            
            # Update system state
            self._data['system_state'].update({
                'last_update': datetime.now().isoformat(),
                'active_routes': sorted(list(active_routes)),
                'total_buses_allocated': total_buses,
                'route_count': len(active_routes)
            })
            
        except Exception as e:
            print(f"[Blackboard] Error updating system state: {e}")


class BlackboardAdapter:
    """
    Adapter for converting between blackboard and legacy dict-based communication.
    Provides backward compatibility with existing code.
    """
    
    def __init__(self, blackboard: Optional[Blackboard] = None):
        """
        Initialize adapter with optional blackboard instance.
        
        Args:
            blackboard: Blackboard instance (creates new if None)
        """
        self.blackboard = blackboard if blackboard is not None else Blackboard()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert blackboard state to simple dictionary format.
        Compatible with legacy agent code expecting plain dicts.
        
        Returns:
            Dictionary representation of blackboard state
        """
        state = {}
        full_state = self.blackboard.get_full_state()
        
        for namespace, data in full_state['data'].items():
            if namespace not in ['system_state', 'urgent_messages']:
                state[namespace] = data
        
        return state
    
    def from_dict(self, data: Dict[str, Any]):
        """
        Populate blackboard from dictionary.
        
        Args:
            data: Dictionary with namespace -> route_id -> observation structure
        """
        for namespace, routes_data in data.items():
            if isinstance(routes_data, dict):
                for route_id, observation in routes_data.items():
                    if isinstance(observation, dict):
                        self.blackboard.post(namespace, route_id, observation)


# Singleton blackboard instance for global access
blackboard = Blackboard()
