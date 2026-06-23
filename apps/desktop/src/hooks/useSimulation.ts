import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useSimulationStore } from "@/store/simulation-store";

/**
 * Subscribes simulation to topology changes: whenever the graph changes and a
 * result already exists (or a live run is active), it recomputes automatically.
 */
export function useSimulation() {
  const revision = useCanvasStore((s) => s.revision);
  const store = useSimulationStore();

  useEffect(() => {
    if (store.result && !store.running) {
      store.runOnce();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  return store;
}
