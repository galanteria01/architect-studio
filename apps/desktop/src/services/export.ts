import type { ArchitectureGraph } from "@/types";

interface ExportBundle {
  app: "architect-studio";
  version: 1;
  name: string;
  exportedAt: number;
  graph: ArchitectureGraph;
}

export function buildBundle(name: string, graph: ArchitectureGraph): ExportBundle {
  return { app: "architect-studio", version: 1, name, exportedAt: Date.now(), graph };
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(name: string, graph: ArchitectureGraph) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture";
  download(`${slug}.json`, JSON.stringify(buildBundle(name, graph), null, 2), "application/json");
}

export async function copyShare(name: string, graph: ArchitectureGraph): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(buildBundle(name, graph)));
}

/** Export the current canvas viewport as a PNG image. */
export async function exportPng(name: string): Promise<void> {
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) throw new Error("Canvas not found");
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(viewport, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#0a0a0a",
    pixelRatio: 2,
  });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture";
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${slug}.png`;
  a.click();
}

export function parseBundle(text: string): ArchitectureGraph | null {
  try {
    const data = JSON.parse(text) as Partial<ExportBundle>;
    if (data.app === "architect-studio" && data.graph) return data.graph;
    // Allow a bare graph too.
    const bare = JSON.parse(text) as ArchitectureGraph;
    if (Array.isArray(bare.nodes) && Array.isArray(bare.edges)) return bare;
  } catch {
    /* ignore */
  }
  return null;
}
