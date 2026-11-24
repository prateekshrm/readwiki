import Header from "@/components/Header";
import { HeaderScrollProvider } from "@/components/HeaderScroll";
import Modal from "@/components/Modal";
import useNetworkAlert from "@/hooks/useNetworkAlert";
import { useTheme } from "@/hooks/useTheme";
import {
    initializeNotifications,
    registerNotificationResponseListener,
    setRouterReady,
} from "@/services/notification";
import {
    loadPreferences,
    usePreferencesStore,
} from "@/stores/preferences.store";
import { BottomSheetProvider } from "@swmansion/react-native-bottom-sheet";
import * as QuickActions from "expo-quick-actions";
import { RouterAction, useQuickActionRouting } from "expo-quick-actions/router";
import { router, Stack, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    useNetworkAlert();
    useQuickActionRouting();

    const { colors } = useTheme();
    const preferences = usePreferencesStore();
    const rootNavigationState = useRootNavigationState();
    const isNavigationReady = Boolean(rootNavigationState?.key);

    useEffect(() => {
        void loadPreferences();
    }, []);

    // Configure Android app shortcuts.
    useEffect(() => {
        QuickActions.setItems<RouterAction>([
            {
                id: "search",
                title: "Search",
                icon: "shortcut_search",
                params: {
                    href: "/(tabs)/search",
                },
            },
            {
                id: "flow",
                title: "Flow",
                icon: "shortcut_flow",
                params: {
                    href: "/(tabs)/flow",
                },
            },
            {
                id: "library",
                title: "Library",
                icon: "shortcut_library",
                params: {
                    href: "/(tabs)/library",
                },
            },
        ]).catch(console.error);
    }, []);

    useEffect(() => {
        if (!preferences.isLoaded) return;

        if (!preferences.onboarded) {
            router.replace("/onboarding");
        }

        void SplashScreen.hideAsync();
    }, [preferences.isLoaded, preferences.onboarded]);

    useEffect(() => {
        registerNotificationResponseListener();
        if (preferences.isLoaded && preferences.onboarded) {
            void initializeNotifications();
        }
    }, [preferences.isLoaded, preferences.onboarded]);

    useEffect(() => {
        if (isNavigationReady) {
            setRouterReady(true);
        }
    }, [isNavigationReady]);

    if (!preferences.isLoaded) {
        return null;
    }

    return (
        <BottomSheetProvider>
            <HeaderScrollProvider>
                <Modal />
                <Stack
                    screenOptions={{
                        headerTransparent: true,
                        contentStyle: { backgroundColor: colors.background },
                        header: ({ options, navigation }) => (
                            <Header
                                title={options.title ?? ""}
                                canGoBack={navigation.canGoBack()}
                                rightComponent={
                                    options.headerRight?.({
                                        tintColor: "#fff",
                                        canGoBack: navigation.canGoBack(),
                                    }) ?? null
                                }
                            />
                        ),
                        animation: "simple_push",
                    }}
                >
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen name="onboarding" options={{ title: "" }} />
                    <Stack.Screen
                        name="article/[article]"
                        options={{ title: "" }}
                    />
                    <Stack.Screen
                        name="trending"
                        options={{ title: "Trending" }}
                    />
                    <Stack.Screen
                        name="news"
                        options={{ title: "In the News" }}
                    />
                    <Stack.Screen
                        name="did-you-know"
                        options={{ title: "Did You Know?" }}
                    />
                    <Stack.Screen
                        name="on-this-day"
                        options={{ title: "On This Day" }}
                    />
                    <Stack.Screen
                        name="history"
                        options={{ title: "History" }}
                    />
                    <Stack.Screen name="saved" options={{ title: "Saved" }} />
                    <Stack.Screen name="about" options={{ title: "About" }} />
                </Stack>
            </HeaderScrollProvider>
        </BottomSheetProvider>
    );
}
