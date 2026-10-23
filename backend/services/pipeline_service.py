import os
import sys
import traceback
import threading
from typing import Any, Dict, Optional

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)
print(f"[Pipeline] Project root: {PROJECT_ROOT}")

class PipelineService:
    """Service to run your existing pipeline"""
    
    def __init__(self):
        self.pipeline = None
        self._inference_lock = threading.Lock()
        self._last_run_timestamp = None
        print("[Pipeline] PipelineService initialized")
    
    def _init_pipeline(self):
        """Lazy initialize the pipeline"""
        if self.pipeline is None:
            print("[Pipeline] Loading CAMATIS pipeline...")
            try:
                from camatis.run_agents_pipeline import CAMATISDecisionPipeline
                self.pipeline = CAMATISDecisionPipeline()
                print("[Pipeline] Pipeline ready!")
            except Exception as e:
                print(f"[Pipeline] Failed to initialize: {e}")
                traceback.print_exc()
                raise
    
    def run_inference(self) -> Dict[str, Any]:
        # A single model run at a time avoids duplicate memory allocations.
        with self._inference_lock:
            return self._run_inference()

    def run_prediction(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        with self._inference_lock:
            from backend.services.predict_service import predict_route
            return predict_route(inputs)

    def prepare_prediction(self) -> Dict[str, Any]:
        """Idempotently warm the models before accepting a form submission."""
        with self._inference_lock:
            from backend.services.predict_service import _load
            _load()
        return {"ready": True, "status": "ready"}

    def _run_inference(self) -> Dict[str, Any]:
        """Run your existing pipeline inference"""
        print("[Pipeline] run_inference called")
        self._init_pipeline()
        
        try:
            print("[Pipeline] Running pipeline...")
            decisions = self.pipeline.run()
            print(f"[Pipeline] Pipeline completed. Decisions: {len(decisions) if decisions else 0}")
            
            self._last_run_timestamp = decisions
            
            return {
                "success": True,
                "message": "Pipeline executed successfully",
                "timestamp": self._last_run_timestamp
            }
        except Exception as e:
            print(f"[Pipeline] Error during run: {e}")
            traceback.print_exc()
            raise

# Singleton instance
pipeline_service = PipelineService()
