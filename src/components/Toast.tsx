import type { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useToastStore } from "@/stores/toast.store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

const ENTER_CONFIG = {
    duration: 360,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
};

const EXIT_CONFIG = {
    duration: 260,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
};

const Toast = () => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(
        () => createStyles(colors, isDark),
        [colors, isDark],
    );
    const insets = useSafeAreaInsets();

    const visible = useToastStore((state) => state.visible);
    const title = useToastStore((state) => state.title);
    const message = useToastStore((state) => state.message);
    const variant = useToastStore((state) => state.variant);
    const duration = useToastStore((state) => state.duration);
    const icon = useToastStore((state) => state.icon);
    const id = useToastStore((state) => state.id);
    const hideToast = useToastStore((state) => state.hideToast);

    const [shouldRender, setShouldRender] = useState(visible);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number | null>(null);
    const wasVisibleRef = useRef(visible);

    const progress = useSharedValue(visible ? 1 : 0);

    if (visible && !shouldRender) {
        setShouldRender(true);
    }

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (visible) {
            const isFreshMount = !wasVisibleRef.current;
            wasVisibleRef.current = true;

            if (isFreshMount) {
                progress.value = 0;
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    progress.value = withTiming(1, ENTER_CONFIG);
                });
            } else {
                progress.value = withTiming(1, ENTER_CONFIG);
            }

            if (duration > 0) {
                timerRef.current = setTimeout(() => {
                    hideToast();
                }, duration);
            }
        } else {
            wasVisibleRef.current = false;
            progress.value = withTiming(0, EXIT_CONFIG, (finished) => {
                if (finished) {
                    scheduleOnRN(setShouldRender, false);
                }
            });
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [visible, id, duration, hideToast, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.35, 1], [0, 0.85, 1]),
        transform: [
            {
                translateY: interpolate(progress.value, [0, 1], [-48, 0]),
            },
            {
                scale: interpolate(progress.value, [0, 1], [0.94, 1]),
            },
        ],
    }));

    if (!shouldRender) {
        return null;
    }

    const isError = variant === "error";
    const iconName =
        icon ?? (isError ? "error-warning-line" : "information-line");
    const iconColor = isError ? "#FFFFFF" : colors.accent;
    const iconBgColor = isError
        ? "rgba(255, 255, 255, 0.18)"
        : isDark
          ? "rgba(22, 22, 20, 0.08)"
          : "rgba(251, 251, 246, 0.14)";

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.wrapper,
                {
                    top: insets.top + 8,
                },
            ]}
        >
            <Animated.View style={[styles.animatedContainer, animatedStyle]}>
                <Pressable
                    onPress={hideToast}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={({ pressed }) => [
                        styles.toast,
                        isError && styles.toastError,
                        pressed && styles.toastPressed,
                    ]}
                >
                    <View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: iconBgColor },
                        ]}
                    >
                        <RemixIcon
                            name={iconName}
                            size={20}
                            color={iconColor}
                            fallback={null}
                        />
                    </View>

                    <View style={styles.textContainer}>
                        <Text
                            style={[styles.title, isError && styles.titleError]}
                            numberOfLines={2}
                        >
                            {title}
                        </Text>

                        {!!message && (
                            <Text
                                style={[
                                    styles.message,
                                    isError && styles.messageError,
                                ]}
                                numberOfLines={1}
                            >
                                {message}
                            </Text>
                        )}
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    );
};

export default Toast;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
    StyleSheet.create({
        wrapper: {
            position: "absolute",
            left: 16,
            right: 16,
            alignItems: "center",
            zIndex: 9999,
        },
        animatedContainer: {
            width: "100%",
            maxWidth: 432,
        },
        toast: {
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 999,
            backgroundColor: colors.primary,
            shadowColor: "#000000",
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowRadius: 14,
            shadowOpacity: isDark ? 0.45 : 0.14,
            boxShadow: "0 10px 50px 0 rgba(0, 0, 0, 0.3)",
        },
        toastError: {
            backgroundColor: colors.error,
        },
        toastPressed: {
            opacity: 0.9,
        },
        iconContainer: {
            width: 48,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            flexShrink: 0,
        },
        textContainer: {
            flex: 1,
            paddingRight: 8,
        },
        title: {
            fontSize: 16,
            fontFamily: "DMSans-SemiBold",
            color: colors.textInverse,
        },
        titleError: {
            color: "#FFFFFF",
        },
        message: {
            fontSize: 13,
            fontFamily: "DMSans-Regular",
            color: isDark
                ? "rgba(22, 22, 20, 0.72)"
                : "rgba(251, 251, 246, 0.76)",
        },
        messageError: {
            color: "rgba(255, 255, 255, 0.84)",
        },
    });
