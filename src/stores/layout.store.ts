import { create } from "zustand";

type LayoutStore = {
    tabBarHeight: number;
    setTabBarHeight: (height: number) => void;
    chatOptionsOpen: boolean;
    setChatOptionsOpen: (value: boolean) => void;
};

export const useLayoutStore = create<LayoutStore>((set) => ({
    tabBarHeight: 0,
    setTabBarHeight: (tabBarHeight: number) => set({ tabBarHeight }),
    chatOptionsOpen: false,
    setChatOptionsOpen: (value: boolean) => set({ chatOptionsOpen: value }),
}));
