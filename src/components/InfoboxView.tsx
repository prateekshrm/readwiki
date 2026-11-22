import RichText from "@/components/RichText";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import type { InfoboxBlock } from "@/services/articleParser";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";

type InfoboxViewProps = {
    block: InfoboxBlock;
    fontScale?: number;
    onLinkPress?: (title: string) => void;
    articleTitle?: string;
};

const InfoboxView = ({
    block,
    fontScale = 1,
    onLinkPress,
    articleTitle,
}: InfoboxViewProps) => {
    const { colors } = useTheme();
    const [expanded, setExpanded] = useState(false);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const progress = useSharedValue(0);
    const measuredHeight = useSharedValue(0);
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        progress.value = withTiming(expanded ? 1 : 0, {
            duration: 280,
            easing: Easing.bezier(0.25, 1, 0.5, 1),
        });
    }, [expanded, progress]);

    const onContentLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const h = Math.ceil(e.nativeEvent.layout.height);
            if (h > 0) {
                setContentHeight(h);
                measuredHeight.value = h;
            }
        },
        [measuredHeight],
    );

    const arrowAnimatedStyle = useAnimatedStyle(() => {
        const rotate = interpolate(progress.value, [0, 1], [0, 180]);
        return {
            transform: [{ rotate: `${rotate}deg` }],
        };
    });

    const bodyAnimatedStyle = useAnimatedStyle(() => {
        const targetHeight = measuredHeight.value || contentHeight;
        return {
            height: progress.value * targetHeight,
            opacity: progress.value,
        };
    });

    const displayTitle = block.title || articleTitle;

    if (!block.items || block.items.length === 0) {
        return null;
    }

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Pressable
                    style={({ pressed }) => [
                        styles.header,
                        pressed && styles.headerPressed,
                    ]}
                    onPress={() => setExpanded((prev) => !prev)}
                >
                    <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                            <RemixIcon
                                name="information-line"
                                size={20}
                                color={colors.accent}
                                fallback={null}
                            />
                        </View>

                        <View style={styles.headerTextWrapper}>
                            <Text style={styles.headerTitle}>Quick Facts</Text>
                            <Text style={styles.headerSubtitle}>
                                {expanded
                                    ? "Click to collapse facts"
                                    : "Click to expand facts"}
                            </Text>
                        </View>
                    </View>

                    <Animated.View style={arrowAnimatedStyle}>
                        <RemixIcon
                            name="arrow-down-s-line"
                            size={20}
                            color={colors.textSecondary}
                            fallback={null}
                        />
                    </Animated.View>
                </Pressable>

                <Animated.View style={[styles.bodyWrapper, bodyAnimatedStyle]}>
                    <View
                        style={styles.bodyContent}
                        onLayout={onContentLayout}
                        pointerEvents={expanded ? "auto" : "none"}
                    >
                        <View style={styles.divider} />

                        {!!displayTitle && (
                            <View style={styles.titleContainer}>
                                <Text
                                    style={[
                                        fraunces,
                                        styles.infoboxTitle,
                                        { fontSize: 20 * fontScale },
                                    ]}
                                >
                                    {displayTitle}
                                </Text>
                            </View>
                        )}

                        <View style={styles.itemsList}>
                            {block.items.map((item, index) => {
                                if (item.type === "header") {
                                    return (
                                        <View
                                            key={`header-${index}`}
                                            style={
                                                styles.sectionHeaderContainer
                                            }
                                        >
                                            <Text
                                                style={styles.sectionHeaderText}
                                            >
                                                {item.title}
                                            </Text>
                                        </View>
                                    );
                                }

                                const prevItem = block.items[index - 1];
                                const isFollowUpRow =
                                    prevItem && prevItem.type === "row";

                                return (
                                    <View
                                        key={`row-${index}`}
                                        style={[
                                            styles.row,
                                            isFollowUpRow && styles.rowDivider,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.rowLabel,
                                                { fontSize: 14 * fontScale },
                                            ]}
                                        >
                                            {item.label}
                                        </Text>

                                        <View style={styles.rowValueContainer}>
                                            <RichText
                                                spans={item.values}
                                                onLinkPress={onLinkPress}
                                                style={[
                                                    styles.rowValueText,
                                                    {
                                                        fontSize:
                                                            14 * fontScale,
                                                        lineHeight:
                                                            20 * fontScale,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </View>
    );
};

export default memo(InfoboxView);

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        wrapper: {
            marginHorizontal: 16,
            marginVertical: 10,
        },
        container: {
            backgroundColor: colors.surface,
            borderRadius: 32,
            overflow: "hidden",
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            backgroundColor: colors.surface,
        },
        headerPressed: {
            backgroundColor: colors.surfaceMuted,
        },
        headerLeft: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
        },
        iconContainer: {
            width: 48,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.backgroundMuted,
            marginRight: 12,
        },
        headerTextWrapper: {
            flex: 1,
        },
        headerTitle: {
            fontSize: 16,
            fontFamily: "DMSans-SemiBold",
            color: colors.text,
        },
        headerSubtitle: {
            fontSize: 13,
            fontFamily: "DMSans-Regular",
            color: colors.textSecondary,
            marginTop: 1,
        },
        bodyWrapper: {
            width: "100%",
            overflow: "hidden",
            position: "relative",
        },
        bodyContent: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingBottom: 16,
        },
        divider: {
            height: 1,
            backgroundColor: colors.backgroundMuted,
            marginHorizontal: 12,
            marginBottom: 4,
        },
        titleContainer: {
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: "center",
            justifyContent: "center",
        },
        infoboxTitle: {
            color: colors.text,
            textAlign: "center",
        },
        itemsList: {
            paddingHorizontal: 12,
        },
        sectionHeaderContainer: {
            marginTop: 14,
            marginBottom: 6,
            paddingHorizontal: 16,
            alignItems: "center",
            justifyContent: "center",
        },
        sectionHeaderText: {
            fontFamily: "DMSans-SemiBold",
            fontSize: 12,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            textAlign: "center",
        },
        row: {
            flexDirection: "row",
            alignItems: "flex-start",
            paddingVertical: 8,
            paddingHorizontal: 4,
            gap: 12,
        },
        rowDivider: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.backgroundMuted,
        },
        rowLabel: {
            width: "36%",
            fontFamily: "DMSans-Medium",
            color: colors.textSecondary,
        },
        rowValueContainer: {
            flex: 1,
        },
        rowValueText: {
            fontFamily: "DMSans-Regular",
            color: colors.text,
        },
    });
