import Colors from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useLayoutStore } from "@/stores/layout.store";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useRef, useState } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_PADDING = 4;
const OUTER_PADDING = 32;
const MAX_TAB_BAR_WIDTH = 400;

const TIMING_CONFIG = {
    duration: 400,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
};

type TabLayout = {
    x: number;
    width: number;
};

export default function TabBar({
    state,
    descriptors,
    emitter,
    navigateToTab,
}: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useTheme();
    const { width: windowWidth } = useWindowDimensions();

    const setTabBarHeight = useLayoutStore((state) => state.setTabBarHeight);

    const currentRoute = state.routes[state.index];
    const isFlow = currentRoute?.name === "flow";
    const colors = isFlow ? Colors.dark : themeColors;

    const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});
    const hasInitialized = useRef(false);

    const isBigScreen = windowWidth > MAX_TAB_BAR_WIDTH + OUTER_PADDING * 2;

    const containerWidth = Math.min(
        windowWidth - OUTER_PADDING * 2,
        MAX_TAB_BAR_WIDTH,
    );
    const fallbackTabWidth =
        (containerWidth - TAB_BAR_PADDING * 2) / (state.routes.length || 1);

    const translateX = useSharedValue(
        TAB_BAR_PADDING + state.index * fallbackTabWidth,
    );
    const indicatorWidth = useSharedValue(fallbackTabWidth);

    useEffect(() => {
        const activeKey = currentRoute?.key;
        const activeLayout = activeKey ? tabLayouts[activeKey] : undefined;
        const targetX = activeLayout
            ? activeLayout.x
            : TAB_BAR_PADDING + state.index * fallbackTabWidth;
        const targetWidth = activeLayout
            ? activeLayout.width
            : fallbackTabWidth;

        if (!hasInitialized.current && activeLayout) {
            hasInitialized.current = true;
            translateX.value = targetX;
            indicatorWidth.value = targetWidth;
            return;
        }

        translateX.value = withTiming(targetX, TIMING_CONFIG);
        indicatorWidth.value = withTiming(targetWidth, TIMING_CONFIG);
    }, [
        state.index,
        currentRoute?.key,
        tabLayouts,
        fallbackTabWidth,
        translateX,
        indicatorWidth,
    ]);

    const handleTabLayout = (routeKey: string, event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        setTabLayouts((prev) => {
            const existing = prev[routeKey];
            if (existing && existing.x === x && existing.width === width) {
                return prev;
            }
            return { ...prev, [routeKey]: { x, width } };
        });
    };

    const activeTabIndicatorStyle = useAnimatedStyle(() => ({
        width: indicatorWidth.value,
        transform: [
            {
                translateX: translateX.value,
            },
        ],
    }));

    return (
        <View
            onLayout={(e) => {
                const height = Math.round(e.nativeEvent.layout.height);
                if (height > 0) {
                    setTabBarHeight(height);
                }
            }}
            style={[
                styles.tabBarWrapper,
                {
                    paddingTop: OUTER_PADDING,
                    paddingHorizontal: OUTER_PADDING,
                    paddingBottom: insets.bottom + OUTER_PADDING / 2,
                },
            ]}
        >
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: insets.bottom,
                    width: windowWidth,
                    backgroundColor: isFlow ? "black" : colors.background,
                }}
            />
            <LinearGradient
                pointerEvents={isBigScreen ? "none" : "auto"}
                colors={[
                    "transparent",
                    isFlow ? "rgba(0, 0, 0, 0.5)" : colors.background,
                ]}
                style={[
                    styles.tabBarGradient,
                    {
                        height: "100%",
                        bottom: insets.bottom,
                    },
                ]}
            />

            <View
                style={[
                    styles.tabBar,
                    {
                        backgroundColor: colors.surface,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.activeTabIndicator,
                        {
                            backgroundColor: colors.primary,
                        },
                        activeTabIndicatorStyle,
                    ]}
                />

                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const icon =
                        typeof options.tabBarIcon === "function"
                            ? options.tabBarIcon({
                                  focused: isFocused,
                                  color: isFocused
                                      ? colors.textInverse
                                      : colors.textMuted,
                                  size: 24,
                              })
                            : null;

                    const onPress = () => {
                        const event = emitter.emit({
                            type: "tabPress",
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigateToTab(route.key);
                        }
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            onLayout={(event) =>
                                handleTabLayout(route.key, event)
                            }
                            style={styles.tab}
                        >
                            {route.name === "flow" ? (
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        {
                                            color: isFocused
                                                ? colors.textInverse
                                                : colors.textMuted,
                                        },
                                    ]}
                                >
                                    {options.title || route.name}
                                </Text>
                            ) : (
                                icon
                            )}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
    },

    tabBarGradient: {
        position: "absolute",
        left: 0,
        right: 0,
    },

    tabBar: {
        flexDirection: "row",
        width: "100%",
        maxWidth: MAX_TAB_BAR_WIDTH,
        borderRadius: 999,
        padding: TAB_BAR_PADDING,
        position: "relative",
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowRadius: 10,
        shadowOpacity: 0.3,
        elevation: 10,
    },

    activeTabIndicator: {
        position: "absolute",
        top: TAB_BAR_PADDING,
        bottom: TAB_BAR_PADDING,
        left: 0,
        borderRadius: 999,
    },

    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        zIndex: 1,
    },

    tabLabel: {
        fontSize: 14,
        fontFamily: "DMSans-Medium",
    },
});
