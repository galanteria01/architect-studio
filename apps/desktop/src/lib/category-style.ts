import type { ComponentCategory } from "@/types";

export interface CategoryStyle {
  label: string;
  /** Solid accent color (hex) for charts/handles. */
  color: string;
  /** Tailwind utility classes for chips/cards. */
  text: string;
  bg: string;
  border: string;
  ring: string;
}

export const CATEGORY_STYLES: Record<ComponentCategory, CategoryStyle> = {
  client: {
    label: "Client",
    color: "#38bdf8",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/40",
    ring: "ring-sky-500/40",
  },
  networking: {
    label: "Networking",
    color: "#a78bfa",
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/40",
    ring: "ring-violet-500/40",
  },
  compute: {
    label: "Compute",
    color: "#34d399",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    ring: "ring-emerald-500/40",
  },
  database: {
    label: "Database",
    color: "#fbbf24",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    ring: "ring-amber-500/40",
  },
  messaging: {
    label: "Messaging",
    color: "#f472b6",
    text: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/40",
    ring: "ring-pink-500/40",
  },
  storage: {
    label: "Storage",
    color: "#22d3ee",
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/40",
    ring: "ring-cyan-500/40",
  },
  ai: {
    label: "AI",
    color: "#e879f9",
    text: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/40",
    ring: "ring-fuchsia-500/40",
  },
  observability: {
    label: "Observability",
    color: "#fb923c",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    ring: "ring-orange-500/40",
  },
};

export function categoryStyle(category: ComponentCategory): CategoryStyle {
  return CATEGORY_STYLES[category];
}
