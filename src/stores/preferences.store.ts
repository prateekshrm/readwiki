import { ThemeMode } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";

export type NotificationPreference = "granted" | "denied" | null;

// User settings that persist between app launches.
export type Preferences = {
    // Whether the user has finished the first-run onboarding screens.
    onboarded: boolean;
    // Reading text size for the article screen. 1 = normal.
    fontScale: number;
    // Open Wikipedia links inside the app (true) — kept as a setting so
    // it is easy to extend later.
    openLinksInApp: boolean;
    // User notification permission status. Defaults to null until asked on first launch.
    notificationPermission: NotificationPreference;
    // Theme mode: "system" | "light" | "dark". Defaults to "system".
    theme: ThemeMode;
};

export interface PreferencesState extends Preferences {
    isLoaded: boolean;
    loadPreferences: () => Promise<void>;
    setPreference: <K extends keyof Preferences>(
        key: K,
        value: Preferences[K],
    ) => void;
    completeOnboarding: () => void;
    resetPreferences: () => Promise<void>;
}

const STORAGE_KEY = "preferences";

export const DEFAULTS: Preferences = {
    onboarded: false,
    fontScale: 1,
    openLinksInApp: true,
    notificationPermission: null,
    theme: "system",
};

// Available reading sizes shown in Settings.
export const FONT_SCALES = [
    { label: "Small", value: 0.9 },
    { label: "Default", value: 1 },
    { label: "Large", value: 1.15 },
    { label: "Extra Large", value: 1.3 },
];

const syncAppearance = (theme: ThemeMode) => {
    Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
};

let loadPromise: Promise<void> | null = null;

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
    ...DEFAULTS,
    isLoaded: false,

    loadPreferences: async () => {
        if (loadPromise) {
            return loadPromise;
        }

        loadPromise = (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const stored = JSON.parse(raw) as Partial<Preferences>;
                    const merged: Preferences = { ...DEFAULTS, ...stored };
                    set({
                        ...merged,
                        isLoaded: true,
                    });
                    syncAppearance(merged.theme);
                    return;
                }
            } catch (error) {
                console.warn("Failed to load preferences from storage:", error);
            } finally {
                set({ isLoaded: true });
                syncAppearance(get().theme);
            }
        })();

        return loadPromise;
    },

    setPreference: <K extends keyof Preferences>(
        key: K,
        value: Preferences[K],
    ) => {
        set((state) => {
            const updated = { ...state, [key]: value };
            if (key === "theme") {
                syncAppearance(value as ThemeMode);
            }

            const toPersist: Preferences = {
                onboarded: updated.onboarded,
                fontScale: updated.fontScale,
                openLinksInApp: updated.openLinksInApp,
                notificationPermission: updated.notificationPermission,
                theme: updated.theme,
            };

            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist)).catch(
                (error) => console.warn("Failed to persist preferences:", error),
            );

            return { [key]: value };
        });
    },

    completeOnboarding: () => {
        get().setPreference("onboarded", true);
    },

    resetPreferences: async () => {
        set({ ...DEFAULTS, isLoaded: true });
        syncAppearance(DEFAULTS.theme);
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn("Failed to reset preferences in storage:", error);
        }
    },
}));

// Kick off loading preferences immediately when module is imported
void usePreferencesStore.getState().loadPreferences();

// Convenience helpers
export const loadPreferences = () =>
    usePreferencesStore.getState().loadPreferences();

export const isPreferencesLoaded = () =>
    usePreferencesStore.getState().isLoaded;

export const getPreferences = () => usePreferencesStore.getState();

export const setPreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
) => usePreferencesStore.getState().setPreference(key, value);

export const completeOnboarding = () =>
    usePreferencesStore.getState().completeOnboarding();

// Backward compatibility alias for the hook
export const usePreferences = usePreferencesStore;
