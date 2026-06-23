import { useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { Search, Star, LayoutTemplate, Boxes as BoxesIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { COMPONENT_LIBRARY, getComponentSpec } from "@/data/components";
import { COMPONENT_CATEGORIES } from "@/types";
import { TEMPLATES } from "@/data/templates";
import { categoryStyle } from "@/lib/category-style";
import { createArchitectureNode } from "@/lib/node-factory";
import { useCanvasStore } from "@/store/canvas-store";
import { useProjectStore } from "@/store/project-store";
import { ComponentLibraryItem } from "./ComponentLibraryItem";
import type { ComponentSpec } from "@/types";

export function ComponentLibrary() {
  const [query, setQuery] = useState("");
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useCanvasStore((s) => s.addNode);
  const loadGraph = useCanvasStore((s) => s.loadGraph);
  const { favorites, toggleFavorite } = useProjectStore(
    useShallow((s) => ({ favorites: s.favorites, toggleFavorite: s.toggleFavorite })),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMPONENT_LIBRARY;
    return COMPONENT_LIBRARY.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.type.includes(q) ||
        c.tags.some((t) => t.includes(q)),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ComponentSpec[]>();
    for (const cat of COMPONENT_CATEGORIES) map.set(cat, []);
    for (const c of filtered) map.get(c.category)?.push(c);
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [filtered]);

  const favoriteSpecs = useMemo(
    () => favorites.map((t) => getComponentSpec(t)).filter(Boolean) as ComponentSpec[],
    [favorites],
  );

  const addAtCenter = (type: string) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNode(createArchitectureNode(type, position));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <h2 className="mb-2 text-sm font-semibold">Component Library</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components..."
            className="h-8 pl-8"
          />
        </div>
      </div>

      <Tabs defaultValue="components" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="mx-3 mt-3 w-auto">
          <TabsTrigger value="components">
            <BoxesIcon /> Components
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star /> Favorites
          </TabsTrigger>
          <TabsTrigger value="templates">
            <LayoutTemplate /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3">
              {grouped.map(([cat, items]) => {
                const style = categoryStyle(cat as ComponentSpec["category"]);
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center gap-2 px-1">
                      <span className={`size-2 rounded-full`} style={{ background: style.color }} />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {style.label}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map((spec) => (
                        <ComponentLibraryItem
                          key={spec.type}
                          spec={spec}
                          favorite={favorites.includes(spec.type)}
                          onToggleFavorite={toggleFavorite}
                          onAdd={addAtCenter}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {grouped.length === 0 && (
                <p className="px-1 text-sm text-muted-foreground">No components match "{query}".</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-0.5 p-3">
              {favoriteSpecs.length === 0 && (
                <p className="px-1 text-sm text-muted-foreground">
                  Star components to pin them here.
                </p>
              )}
              {favoriteSpecs.map((spec) => (
                <ComponentLibraryItem
                  key={spec.type}
                  spec={spec}
                  favorite
                  onToggleFavorite={toggleFavorite}
                  onAdd={addAtCenter}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {TEMPLATES.map((tpl) => (
                <div key={tpl.key} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{tpl.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{tpl.description}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      onClick={() => {
                        loadGraph(structuredClone(tpl.graph));
                        toast.success(`Loaded "${tpl.name}"`);
                      }}
                      aria-label={`Load ${tpl.name}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
