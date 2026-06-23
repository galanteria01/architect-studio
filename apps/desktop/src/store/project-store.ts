import { create } from "zustand";
import type { ArchitectureGraph, ProjectSummary } from "@/types";
import { storage } from "@/services/storage";
import { uuid as makeUuid } from "@/lib/id";
import { useCanvasStore } from "./canvas-store";

export type Theme = "light" | "dark";

interface ProjectState {
  projectUuid: string;
  projectName: string;
  projectDescription: string;
  dirty: boolean;
  lastSavedAt: number | null;
  projects: ProjectSummary[];
  favorites: string[];
  theme: Theme;
  initialized: boolean;

  init: () => Promise<void>;
  newProject: (name?: string) => void;
  saveCurrent: () => Promise<void>;
  loadProject: (uuid: string) => Promise<void>;
  deleteProject: (uuid: string) => Promise<void>;
  renameCurrent: (name: string) => void;
  setDescription: (description: string) => void;
  refreshProjects: () => Promise<void>;
  toggleFavorite: (componentType: string) => Promise<void>;
  setTheme: (theme: Theme) => void;
  markDirty: () => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectUuid: makeUuid(),
  projectName: "Untitled Architecture",
  projectDescription: "",
  dirty: false,
  lastSavedAt: null,
  projects: [],
  favorites: [],
  theme: "dark",
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    applyTheme(get().theme);
    try {
      const [favorites, themePref] = await Promise.all([
        storage().listFavorites(),
        storage().getPreference("theme"),
      ]);
      const theme = (themePref as Theme) || "dark";
      applyTheme(theme);
      set({ favorites, theme });
      await get().refreshProjects();
    } catch (err) {
      console.warn("Project store init failed:", err);
    }
    // Mark dirty whenever the canvas topology changes.
    useCanvasStore.subscribe((state, prev) => {
      if (state.revision !== prev.revision) set({ dirty: true });
    });
    set({ initialized: true });
  },

  newProject: (name) => {
    useCanvasStore.getState().clear();
    set({
      projectUuid: makeUuid(),
      projectName: name ?? "Untitled Architecture",
      projectDescription: "",
      dirty: false,
      lastSavedAt: null,
    });
  },

  saveCurrent: async () => {
    const graph: ArchitectureGraph = useCanvasStore.getState().getGraph();
    const now = Date.now();
    const { projectUuid, projectName, projectDescription } = get();
    const existing = await storage().getProject(projectUuid);
    await storage().saveProject({
      uuid: projectUuid,
      name: projectName,
      description: projectDescription,
      graph,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    set({ dirty: false, lastSavedAt: now });
    await get().refreshProjects();
  },

  loadProject: async (uuid) => {
    const project = await storage().getProject(uuid);
    if (!project) return;
    useCanvasStore.getState().loadGraph(project.graph);
    set({
      projectUuid: project.uuid,
      projectName: project.name,
      projectDescription: project.description,
      dirty: false,
      lastSavedAt: project.updatedAt,
    });
  },

  deleteProject: async (uuid) => {
    await storage().deleteProject(uuid);
    if (get().projectUuid === uuid) get().newProject();
    await get().refreshProjects();
  },

  renameCurrent: (name) => set({ projectName: name, dirty: true }),
  setDescription: (description) => set({ projectDescription: description, dirty: true }),

  refreshProjects: async () => {
    const projects = await storage().listProjects();
    set({ projects });
  },

  toggleFavorite: async (componentType) => {
    const favorites = await storage().toggleFavorite(componentType);
    set({ favorites });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
    void storage().setPreference("theme", theme);
  },

  markDirty: () => set({ dirty: true }),
}));
