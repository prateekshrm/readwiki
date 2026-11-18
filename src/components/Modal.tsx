import type { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useModalStore } from "@/stores/modal.store";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Modal = () => {
    const { colors, colorScheme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();

    const { visible, title, message, confirmButton, dismissButton, hideModal } =
        useModalStore();

    const index = visible ? 1 : 0;

    const handleIndexChange = (nextIndex: number) => {
        if (nextIndex === 0) {
            hideModal();
        }
    };

    const handleConfirm = async () => {
        await confirmButton?.onPress?.();
        hideModal();
    };

    const handleDismiss = async () => {
        await dismissButton?.onPress?.();
        hideModal();
    };

    return (
        <ModalBottomSheet
            index={index}
            onIndexChange={handleIndexChange}
            onCloseRequest={hideModal}
            detents={[
                0,
                {
                    value: "content",
                    insets: { left: 16, right: 16, bottom: insets.bottom + 16 },
                },
            ]}
            scrimColor="rgba(0, 0, 0, 0.4)"
            lazy
            surface={
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: colors.surface },
                    ]}
                />
            }
            surfaceStyle={{
                borderRadius: 24,
            }}
            settleDuration={300}
        >
            <View style={[styles.container]}>
                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>
                    {title}
                </Text>

                {/* Message */}
                {!!message && (
                    <Text
                        style={[
                            styles.message,
                            { color: colors.textSecondary },
                        ]}
                    >
                        {message}
                    </Text>
                )}

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                    {dismissButton && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                styles.buttonDismiss,
                                {
                                    backgroundColor: colors.backgroundMuted,
                                },
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={handleDismiss}
                        >
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: colors.text },
                                ]}
                            >
                                {dismissButton.label}
                            </Text>
                        </Pressable>
                    )}

                    {confirmButton && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                confirmButton.variant === "destructive"
                                    ? styles.buttonDestructive
                                    : styles.buttonConfirm,
                                {
                                    backgroundColor:
                                        confirmButton.variant === "destructive"
                                            ? colors.error
                                            : colors.primary,
                                },
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={handleConfirm}
                        >
                            <Text
                                style={[
                                    styles.buttonText,
                                    {
                                        color:
                                            colorScheme === "dark" &&
                                            confirmButton.variant ===
                                                "destructive"
                                                ? colors.text
                                                : colors.textInverse,
                                    },
                                ]}
                            >
                                {confirmButton.label}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </ModalBottomSheet>
    );
};

export default Modal;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            padding: 16,
        },
        title: {
            fontSize: 24,
            fontFamily: "Fraunces-Medium",
            marginBottom: 8,
            textAlign: "center",
        },
        message: {
            fontSize: 16,
            fontFamily: "DMSans-Regular",
            textAlign: "center",
        },
        buttonsContainer: {
            flexDirection: "row",
            gap: 10,
            marginTop: 20,
        },
        button: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonConfirm: {},
        buttonDestructive: {},
        buttonDismiss: {},
        buttonText: {
            fontSize: 14,
            fontFamily: "DMSans-SemiBold",
        },
        buttonPressed: {
            opacity: 0.8,
            transform: [{ scale: 0.98 }],
        },
    });
