import RichText from "@/components/RichText";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import type { Span } from "@/services/articleParser";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ActiveReference = {
    id: string;
    label: string;
    spans?: Span[];
};

type ReferenceSheetProps = {
    activeRef: ActiveReference | null;
    onDismiss: () => void;
    onLinkPress: (title: string) => void;
    onRefPress?: (refId: string, label: string) => void;
    onJumpToReferences?: () => void;
};

const ReferenceSheet = ({
    activeRef,
    onDismiss,
    onLinkPress,
    onRefPress,
    onJumpToReferences,
}: ReferenceSheetProps) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const [prevRef, setPrevRef] = useState<ActiveReference | null>(activeRef);
    if (activeRef && activeRef !== prevRef) {
        setPrevRef(activeRef);
    }

    const index = activeRef ? 1 : 0;
    const displayedRef = activeRef ?? prevRef;

    const handleIndexChange = (nextIndex: number) => {
        if (nextIndex === 0) {
            onDismiss();
        }
    };

    const handleSheetLinkPress = (target: string) => {
        onDismiss();
        onLinkPress(target);
    };

    const handleSheetRefPress = (refId: string, label: string) => {
        onDismiss();
        setTimeout(() => {
            onRefPress?.(refId, label);
        }, 250);
    };

    const handleJump = () => {
        onDismiss();
        onJumpToReferences?.();
    };

    return (
        <ModalBottomSheet
            index={index}
            onIndexChange={handleIndexChange}
            detents={[0, "content"]}
            scrimColor="rgba(0, 0, 0, 0.4)"
            surface={
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: colors.surface },
                    ]}
                />
            }
            surfaceStyle={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
            }}
            settleDuration={300}
        >
            <View style={styles.sheetHandleContainer}>
                <View style={styles.sheetHandle} />
            </View>

            <View
                style={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + 16 },
                ]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {displayedRef?.label ?? ""}
                        </Text>
                    </View>
                    <Text style={[fraunces, styles.title]}>Reference</Text>
                </View>

                <ScrollView
                    style={[styles.scroll, { maxHeight: windowHeight * 0.6 }]}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                >
                    {displayedRef?.spans && displayedRef.spans.length > 0 ? (
                        <RichText
                            spans={displayedRef.spans}
                            onLinkPress={handleSheetLinkPress}
                            onRefPress={
                                onRefPress ? handleSheetRefPress : undefined
                            }
                            style={styles.referenceText}
                        />
                    ) : (
                        <Text style={styles.emptyText}>
                            Reference details are not available.
                        </Text>
                    )}
                </ScrollView>

                {!!onJumpToReferences && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.jumpButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleJump}
                    >
                        <Text style={styles.jumpButtonText}>
                            View in References
                        </Text>
                        <RemixIcon
                            name="arrow-down-s-line"
                            size={18}
                            color={colors.text}
                            fallback={null}
                        />
                    </Pressable>
                )}
            </View>
        </ModalBottomSheet>
    );
};

export default ReferenceSheet;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        sheetHandleContainer: {
            alignItems: "center",
            paddingTop: 10,
            paddingBottom: 6,
        },
        sheetHandle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.textSecondary,
        },
        contentContainer: {
            padding: 16,
            gap: 14,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        badge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: colors.backgroundMuted,
        },
        badgeText: {
            fontSize: 13,
            fontFamily: "DMSans-SemiBold",
            color: colors.link,
        },
        title: {
            fontSize: 22,
            color: colors.text,
        },
        scroll: {
            flexGrow: 0,
        },
        referenceText: {
            fontSize: 15,
            lineHeight: 23,
            fontFamily: "DMSans-Regular",
            color: colors.text,
        },
        emptyText: {
            fontSize: 15,
            lineHeight: 22,
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
        },
        jumpButton: {
            width: "100%",
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: colors.backgroundMuted,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 4,
        },
        jumpButtonText: {
            fontSize: 15,
            fontFamily: "DMSans-SemiBold",
            color: colors.text,
        },
        buttonPressed: {
            opacity: 0.8,
            transform: [{ scale: 0.98 }],
        },
    });
