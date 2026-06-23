import { useEffect, useState } from "react";
import { aiClient } from "@/services/ai";

/** Polls the AI sidecar health endpoint so the UI can reflect availability. */
export function useAiStatus(intervalMs = 5000): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const ok = await aiClient.isReachable();
      if (active) setOnline(ok);
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return online;
}
