import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewDensity = "default" | "compact";
type DetailPanelMode = "overlay" | "pinned";

interface UIState {
  viewDensity: ViewDensity;
  setViewDensity: (d: ViewDensity) => void;
  detailPanelMode: DetailPanelMode;
  setDetailPanelMode: (m: DetailPanelMode) => void;
  chatExpanded: boolean;
  setChatExpanded: (e: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewDensity: "compact",
      setViewDensity: (viewDensity) => set({ viewDensity }),
      detailPanelMode: "overlay",
      setDetailPanelMode: (detailPanelMode) => set({ detailPanelMode }),
      chatExpanded: false,
      setChatExpanded: (chatExpanded) => set({ chatExpanded }),
    }),
    { name: "gtms-ui-preferences" }
  )
);
