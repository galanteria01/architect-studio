export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatRps(rps: number): string {
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(1)}M rps`;
  if (rps >= 1_000) return `${(rps / 1_000).toFixed(1)}K rps`;
  return `${Math.round(rps)} rps`;
}

export function formatCost(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${Math.round(usd)}`;
}

export function formatAvailability(fraction: number): string {
  const pct = fraction * 100;
  if (pct >= 99.99) return `${pct.toFixed(3)}%`;
  if (pct >= 99) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

/** Downtime per year given an availability fraction. */
export function formatDowntime(fraction: number): string {
  const downMinutesPerYear = (1 - fraction) * 365 * 24 * 60;
  if (downMinutesPerYear >= 60 * 24) {
    return `${(downMinutesPerYear / (60 * 24)).toFixed(1)} days/yr`;
  }
  if (downMinutesPerYear >= 60) {
    return `${(downMinutesPerYear / 60).toFixed(1)} hrs/yr`;
  }
  return `${downMinutesPerYear.toFixed(0)} min/yr`;
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
