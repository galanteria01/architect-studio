import { create } from "zustand";

export type AppPage = "builder" | "simulator" | "interview";
export type BottomTab = "metrics" | "timeline" | "trace" | "issues";
export type RightTab = "properties" | "learning" | "config";

interface UIState {
  page: AppPage;
  bottomTab: BottomTab;
  rightTab: RightTab;
  bottomCollapsed: boolean;

  generatorOpen: boolean;
  reviewOpen: boolean;
  optimizeOpen: boolean;
  projectsOpen: boolean;

  setPage: (page: AppPage) => void;
  setBottomTab: (tab: BottomTab) => void;
  setRightTab: (tab: RightTab) => void;
  toggleBottom: () => void;

  openGenerator: () => void;
  closeGenerator: () => void;
  openReview: () => void;
  closeReview: () => void;
  openOptimize: () => void;
  closeOptimize: () => void;
  setProjectsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  page: "builder",
  bottomTab: "metrics",
  rightTab: "properties",
  bottomCollapsed: false,

  generatorOpen: false,
  reviewOpen: false,
  optimizeOpen: false,
  projectsOpen: false,

  setPage: (page) => set({ page }),
  setBottomTab: (bottomTab) => set({ bottomTab, bottomCollapsed: false }),
  setRightTab: (rightTab) => set({ rightTab }),
  toggleBottom: () => set((s) => ({ bottomCollapsed: !s.bottomCollapsed })),

  openGenerator: () => set({ generatorOpen: true }),
  closeGenerator: () => set({ generatorOpen: false }),
  openReview: () => set({ reviewOpen: true }),
  closeReview: () => set({ reviewOpen: false }),
  openOptimize: () => set({ optimizeOpen: true }),
  closeOptimize: () => set({ optimizeOpen: false }),
  setProjectsOpen: (projectsOpen) => set({ projectsOpen }),
}));
