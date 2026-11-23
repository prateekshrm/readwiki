import RichText from "@/components/RichText";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import type { InfoboxBlock, InfoboxImage } from "@/services/articleParser";
import { usePreferencesStore } from "@/stores/preferences.store";
import { Image } from "expo-image";
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
    onLinkPress?: (title: string) => void;
    onImagePress?: (src: string) => void;
    articleTitle?: string;
};

const InfoboxImageCard = memo(
    ({
        image,
        fontScale = 1,
        onImagePress,
        styles,
    }: {
        image: InfoboxImage;
        fontScale?: number;
        onImagePress?: (src: string) => void;
        styles: ReturnType<typeof createStyles>;
    }) => {
        const aspectRatio =
            image.width && image.height
                ? Math.max(0.5, Math.min(2.5, image.width / image.height))
                : 4 / 3;

        return (
            <View style={styles.imageCard}>
                <Pressable
                    onPress={() => onImagePress?.(image.src)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={
                        image.alt || image.caption || "Infobox image"
                    }
                >
                    <View style={styles.imageContainer}>
                        <Image
                            source={image.src}
                            style={[styles.image, { aspectRatio }]}
                            contentFit="contain"
                            transition={150}
                            cachePolicy="memory-disk"
                        />
                    </View>
                </Pressable>
                {!!image.caption && (
                    <Text
                        style={[
                            styles.imageCaption,
                            {
                                fontSize: 12 * fontScale,
                                lineHeight: 16 * fontScale,
                            },
                        ]}
                    >
                        {image.caption}
                    </Text>
                )}
            </View>
        );
    },
);
InfoboxImageCard.displayName = "InfoboxImageCard";

const InfoboxImagesBlock = memo(
    ({
        images,
        grid,
        caption,
        fontScale = 1,
        onImagePress,
        styles,
    }: {
        images: InfoboxImage[];
        grid?: InfoboxImage[][];
        caption?: string;
        fontScale?: number;
        onImagePress?: (src: string) => void;
        styles: ReturnType<typeof createStyles>;
    }) => {
        if (!images || images.length === 0) return null;

        // If structured as a grid (e.g. WWII collage or 2x3 tabular montage)
        if (grid && grid.length > 0) {
            return (
                <View style={styles.gridSection}>
                    <View style={styles.gridContainer}>
                        {grid.map((row, rowIdx) => (
                            <View key={rowIdx} style={styles.gridRow}>
                                {row.map((img, colIdx) => {
                                    const flex =
                                        img.width && img.height
                                            ? img.width / img.height
                                            : 1;
                                    const aspectRatio =
                                        img.width && img.height
                                            ? Math.max(
                                                  0.4,
                                                  Math.min(
                                                      2.5,
                                                      img.width / img.height,
                                                  ),
                                              )
                                            : 4 / 3;

                                    return (
                                        <View
                                            key={colIdx}
                                            style={[styles.gridCell, { flex }]}
                                        >
                                            <Pressable
                                                onPress={() =>
                                                    onImagePress?.(img.src)
                                                }
                                                accessibilityRole="imagebutton"
                                                accessibilityLabel={
                                                    img.alt ||
                                                    img.caption ||
                                                    "Image"
                                                }
                                                style={styles.gridPressable}
                                            >
                                                <Image
                                                    source={img.src}
                                                    style={[
                                                        styles.gridImage,
                                                        { aspectRatio },
                                                    ]}
                                                    contentFit="cover"
                                                    transition={150}
                                                    cachePolicy="memory-disk"
                                                />
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                    {!!caption && (
                        <Text
                            style={[
                                styles.imageCaption,
                                {
                                    fontSize: 12 * fontScale,
                                    lineHeight: 16 * fontScale,
                                },
                            ]}
                        >
                            {caption}
                        </Text>
                    )}
                </View>
            );
        }

        // If exactly 2 images without lengthy captions, render side-by-side
        const canPair =
            images.length === 2 &&
            images.every(
                (img) => !img.caption || img.caption.trim().length < 35,
            );

        if (canPair) {
            return (
                <View style={styles.gridSection}>
                    <View style={styles.pairedImagesRow}>
                        {images.map((img, idx) => (
                            <View key={idx} style={styles.pairedImageCol}>
                                <InfoboxImageCard
                                    image={img}
                                    fontScale={fontScale}
                                    onImagePress={onImagePress}
                                    styles={styles}
                                />
                            </View>
                        ))}
                    </View>
                    {!!caption && (
                        <Text
                            style={[
                                styles.imageCaption,
                                {
                                    fontSize: 12 * fontScale,
                                    lineHeight: 16 * fontScale,
                                },
                            ]}
                        >
                            {caption}
                        </Text>
                    )}
                </View>
            );
        }

        return (
            <View style={styles.stackedImagesContainer}>
                {images.map((img, idx) => (
                    <InfoboxImageCard
                        key={idx}
                        image={img}
                        fontScale={fontScale}
                        onImagePress={onImagePress}
                        styles={styles}
                    />
                ))}
                {!!caption && (
                    <Text
                        style={[
                            styles.imageCaption,
                            {
                                fontSize: 12 * fontScale,
                                lineHeight: 16 * fontScale,
                            },
                        ]}
                    >
                        {caption}
                    </Text>
                )}
            </View>
        );
    },
);
InfoboxImagesBlock.displayName = "InfoboxImagesBlock";

const getSubtitle = (items: InfoboxBlock["items"]): string | null => {
    // 1. Try to find explicit section headers (type === "header")
    const explicitHeaders = items
        .filter(
            (
                item,
            ): item is Extract<
                InfoboxBlock["items"][number],
                { type: "header" }
            > => item.type === "header",
        )
        .map((item) => item.title.trim())
        .filter(Boolean);

    if (explicitHeaders.length >= 2) {
        return `${explicitHeaders[0]}, ${explicitHeaders[1]}...`;
    }

    // 2. Otherwise get headings/labels from the first available items
    const headings: string[] = [];
    for (const item of items) {
        let name = "";
        if (item.type === "header") {
            name = item.title.trim();
        } else if (item.type === "subheader") {
            name = item.values
                .map((s) => s.text)
                .join("")
                .trim();
        } else if (item.type === "row") {
            name = item.label.trim();
        } else if (item.type === "comparison") {
            if (item.label) {
                name = item.label.trim();
            } else if (item.columns && item.columns.length > 0) {
                const colTexts = item.columns
                    .map((c) =>
                        c.spans
                            .map((s) => s.text)
                            .join("")
                            .trim(),
                    )
                    .filter(Boolean);
                if (colTexts.length > 0) {
                    name = colTexts.join(" / ");
                }
            }
        }

        if (name && !headings.includes(name)) {
            headings.push(name);
            if (headings.length === 2) break;
        }
    }

    if (headings.length >= 2) {
        return `${headings[0]}, ${headings[1]}...`;
    }
    if (headings.length === 1) {
        return `${headings[0]}...`;
    }

    return null;
};

const InfoboxView = ({
    block,
    onLinkPress,
    onImagePress,
    articleTitle,
}: InfoboxViewProps) => {
    const { colors } = useTheme();
    const fontScale = usePreferencesStore((state) => state.fontScale);
    const [expanded, setExpanded] = useState(false);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const progress = useSharedValue(0);
    const measuredHeight = useSharedValue(0);
    const [contentHeight, setContentHeight] = useState(0);

    const subtitle = useMemo(() => getSubtitle(block.items), [block.items]);
    const displaySubtitle =
        subtitle ||
        (expanded ? "Click to collapse facts" : "Click to expand facts");

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
                            <Text
                                style={styles.headerSubtitle}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {displaySubtitle}
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

                        {!!block.images && block.images.length > 0 ? (
                            <View style={styles.imageSection}>
                                <InfoboxImagesBlock
                                    images={block.images}
                                    grid={block.grid}
                                    caption={block.caption}
                                    fontScale={fontScale}
                                    onImagePress={onImagePress}
                                    styles={styles}
                                />
                            </View>
                        ) : !!block.image?.src ? (
                            <View style={styles.imageSection}>
                                <InfoboxImageCard
                                    image={block.image}
                                    fontScale={fontScale}
                                    onImagePress={onImagePress}
                                    styles={styles}
                                />
                            </View>
                        ) : null}

                        <View style={styles.itemsList}>
                            {block.items.map((item, index) => {
                                if (item.type === "images") {
                                    return (
                                        <View
                                            key={`images-${index}`}
                                            style={styles.inlineImagesSection}
                                        >
                                            <InfoboxImagesBlock
                                                images={item.images}
                                                grid={item.grid}
                                                caption={item.caption}
                                                fontScale={fontScale}
                                                onImagePress={onImagePress}
                                                styles={styles}
                                            />
                                        </View>
                                    );
                                }

                                if (item.type === "subheader") {
                                    return (
                                        <View
                                            key={`subheader-${index}`}
                                            style={styles.subheaderContainer}
                                        >
                                            <RichText
                                                spans={item.values}
                                                onLinkPress={onLinkPress}
                                                style={[
                                                    styles.subheaderText,
                                                    {
                                                        fontSize:
                                                            13 * fontScale,
                                                        lineHeight:
                                                            18 * fontScale,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    );
                                }

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

                                if (item.type === "comparison") {
                                    if (item.isScore) {
                                        return (
                                            <View
                                                key={`score-${index}`}
                                                style={styles.scoreCard}
                                            >
                                                {!!item.label && (
                                                    <Text
                                                        style={
                                                            styles.scoreLabel
                                                        }
                                                    >
                                                        {item.label.toUpperCase()}
                                                    </Text>
                                                )}
                                                <View style={styles.scoreRow}>
                                                    <View
                                                        style={styles.scoreCol}
                                                    >
                                                        <RichText
                                                            spans={
                                                                item.columns[0]
                                                                    ?.spans ||
                                                                []
                                                            }
                                                            onLinkPress={
                                                                onLinkPress
                                                            }
                                                            style={[
                                                                fraunces,
                                                                styles.scoreNumber,
                                                                {
                                                                    fontSize:
                                                                        26 *
                                                                        fontScale,
                                                                },
                                                            ]}
                                                        />
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.scoreDash,
                                                            {
                                                                fontSize:
                                                                    20 *
                                                                    fontScale,
                                                            },
                                                        ]}
                                                    >
                                                        –
                                                    </Text>
                                                    <View
                                                        style={styles.scoreCol}
                                                    >
                                                        <RichText
                                                            spans={
                                                                item.columns[1]
                                                                    ?.spans ||
                                                                []
                                                            }
                                                            onLinkPress={
                                                                onLinkPress
                                                            }
                                                            style={[
                                                                fraunces,
                                                                styles.scoreNumber,
                                                                {
                                                                    fontSize:
                                                                        26 *
                                                                        fontScale,
                                                                },
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    }

                                    const hasLargeImages = item.columns.some(
                                        (col) =>
                                            col.images?.some(
                                                (img) =>
                                                    (img.width ?? 0) > 40 ||
                                                    (img.height ?? 0) > 40,
                                            ),
                                    );

                                    if (hasLargeImages) {
                                        return (
                                            <View
                                                key={`portraits-${index}`}
                                                style={styles.portraitsRow}
                                            >
                                                {item.columns.map(
                                                    (col, colIdx) => {
                                                        const largeImg =
                                                            col.images?.find(
                                                                (img) =>
                                                                    (img.width ??
                                                                        0) >
                                                                        40 ||
                                                                    (img.height ??
                                                                        0) > 40,
                                                            );
                                                        if (!largeImg)
                                                            return null;
                                                        return (
                                                            <View
                                                                key={colIdx}
                                                                style={
                                                                    styles.portraitCol
                                                                }
                                                            >
                                                                <Pressable
                                                                    onPress={() => {
                                                                        if (
                                                                            largeImg.link
                                                                        ) {
                                                                            onLinkPress?.(
                                                                                largeImg.link,
                                                                            );
                                                                        } else if (
                                                                            onImagePress
                                                                        ) {
                                                                            onImagePress(
                                                                                largeImg.src,
                                                                            );
                                                                        }
                                                                    }}
                                                                    accessibilityRole="imagebutton"
                                                                    accessibilityLabel={
                                                                        largeImg.alt ||
                                                                        "Photo"
                                                                    }
                                                                >
                                                                    <Image
                                                                        source={
                                                                            largeImg.src
                                                                        }
                                                                        style={[
                                                                            styles.portraitImage,
                                                                            {
                                                                                width:
                                                                                    125 *
                                                                                    fontScale,
                                                                                height:
                                                                                    145 *
                                                                                    fontScale,
                                                                            },
                                                                        ]}
                                                                        contentFit="cover"
                                                                        transition={
                                                                            150
                                                                        }
                                                                        cachePolicy="memory-disk"
                                                                    />
                                                                </Pressable>
                                                            </View>
                                                        );
                                                    },
                                                )}
                                            </View>
                                        );
                                    }

                                    const prevItem = block.items[index - 1];
                                    const isFollowUp =
                                        prevItem &&
                                        (prevItem.type === "row" ||
                                            prevItem.type === "comparison");

                                    return (
                                        <View
                                            key={`comp-${index}`}
                                            style={styles.comparisonWrapper}
                                        >
                                            {!!item.label && (
                                                <View
                                                    style={
                                                        styles.comparisonLabelContainer
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.comparisonLabelText
                                                        }
                                                    >
                                                        {item.label}
                                                    </Text>
                                                </View>
                                            )}
                                            <View
                                                style={[
                                                    styles.comparisonRow,
                                                    isFollowUp &&
                                                        styles.rowDivider,
                                                ]}
                                            >
                                                {item.columns.map(
                                                    (col, colIdx) => (
                                                        <View
                                                            key={colIdx}
                                                            style={[
                                                                styles.comparisonCol,
                                                                colIdx > 0 &&
                                                                    styles.comparisonColBorder,
                                                                col.align ===
                                                                    "left" && {
                                                                    alignItems:
                                                                        "flex-start",
                                                                },
                                                                col.align ===
                                                                    "right" && {
                                                                    alignItems:
                                                                        "flex-end",
                                                                },
                                                                col.align ===
                                                                    "center" && {
                                                                    alignItems:
                                                                        "center",
                                                                },
                                                            ]}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.comparisonContent,
                                                                    col.align ===
                                                                        "left" && {
                                                                        justifyContent:
                                                                            "flex-start",
                                                                    },
                                                                    col.align ===
                                                                        "right" && {
                                                                        justifyContent:
                                                                            "flex-end",
                                                                    },
                                                                    col.align ===
                                                                        "center" && {
                                                                        justifyContent:
                                                                            "center",
                                                                    },
                                                                ]}
                                                            >
                                                                {col.images?.map(
                                                                    (
                                                                        img,
                                                                        imgIdx,
                                                                    ) => {
                                                                        const rawW =
                                                                            img.width ||
                                                                            22;
                                                                        const rawH =
                                                                            img.height ||
                                                                            15;
                                                                        const scale =
                                                                            Math.min(
                                                                                fontScale,
                                                                                1.25,
                                                                            );
                                                                        const w =
                                                                            Math.round(
                                                                                rawW *
                                                                                    scale,
                                                                            );
                                                                        const h =
                                                                            Math.round(
                                                                                rawH *
                                                                                    scale,
                                                                            );
                                                                        const imgEl =
                                                                            (
                                                                                <Image
                                                                                    key={
                                                                                        imgIdx
                                                                                    }
                                                                                    source={
                                                                                        img.src
                                                                                    }
                                                                                    style={{
                                                                                        width: w,
                                                                                        height: h,
                                                                                        marginRight: 6,
                                                                                    }}
                                                                                    contentFit="contain"
                                                                                    cachePolicy="memory-disk"
                                                                                />
                                                                            );
                                                                        if (
                                                                            img.link
                                                                        ) {
                                                                            return (
                                                                                <Pressable
                                                                                    key={
                                                                                        imgIdx
                                                                                    }
                                                                                    onPress={() =>
                                                                                        onLinkPress?.(
                                                                                            img.link!,
                                                                                        )
                                                                                    }
                                                                                    hitSlop={
                                                                                        4
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        imgEl
                                                                                    }
                                                                                </Pressable>
                                                                            );
                                                                        }
                                                                        return imgEl;
                                                                    },
                                                                )}
                                                                {col.spans
                                                                    .length >
                                                                    0 && (
                                                                    <RichText
                                                                        spans={
                                                                            col.spans
                                                                        }
                                                                        onLinkPress={
                                                                            onLinkPress
                                                                        }
                                                                        style={[
                                                                            styles.comparisonText,
                                                                            {
                                                                                fontSize:
                                                                                    14 *
                                                                                    fontScale,
                                                                                lineHeight:
                                                                                    20 *
                                                                                    fontScale,
                                                                                textAlign:
                                                                                    col.align ||
                                                                                    "center",
                                                                            },
                                                                        ]}
                                                                    />
                                                                )}
                                                            </View>
                                                        </View>
                                                    ),
                                                )}
                                            </View>
                                        </View>
                                    );
                                }

                                const prevItem = block.items[index - 1];
                                const isFollowUpRow =
                                    prevItem &&
                                    (prevItem.type === "row" ||
                                        prevItem.type === "comparison");

                                const rowImages = item.images;

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
                                            <View
                                                style={styles.rowValueContent}
                                            >
                                                {rowImages?.map(
                                                    (img, imgIdx) => {
                                                        const rawW =
                                                            img.width || 22;
                                                        const rawH =
                                                            img.height || 16;
                                                        const scale = Math.min(
                                                            fontScale,
                                                            1.25,
                                                        );
                                                        const w = Math.round(
                                                            rawW * scale,
                                                        );
                                                        const h = Math.round(
                                                            rawH * scale,
                                                        );

                                                        const imgEl = (
                                                            <Image
                                                                key={imgIdx}
                                                                source={img.src}
                                                                style={{
                                                                    width: w,
                                                                    height: h,
                                                                    marginRight: 6,
                                                                    borderRadius: 2,
                                                                }}
                                                                contentFit="contain"
                                                                cachePolicy="memory-disk"
                                                            />
                                                        );

                                                        if (img.link) {
                                                            return (
                                                                <Pressable
                                                                    key={imgIdx}
                                                                    onPress={() =>
                                                                        onLinkPress?.(
                                                                            img.link!,
                                                                        )
                                                                    }
                                                                    hitSlop={4}
                                                                >
                                                                    {imgEl}
                                                                </Pressable>
                                                            );
                                                        }
                                                        return imgEl;
                                                    },
                                                )}
                                                {item.values.length > 0 && (
                                                    <RichText
                                                        spans={item.values}
                                                        onLinkPress={
                                                            onLinkPress
                                                        }
                                                        style={[
                                                            styles.rowValueText,
                                                            {
                                                                fontSize:
                                                                    14 *
                                                                    fontScale,
                                                                lineHeight:
                                                                    20 *
                                                                    fontScale,
                                                            },
                                                        ]}
                                                    />
                                                )}
                                            </View>
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
            marginRight: 8,
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
        imageSection: {
            alignItems: "center",
            paddingHorizontal: 16,
            marginBottom: 12,
        },
        inlineImagesSection: {
            alignItems: "center",
            paddingHorizontal: 4,
            marginVertical: 10,
        },
        gridSection: {
            width: "100%",
            alignItems: "center",
        },
        gridContainer: {
            width: "100%",
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: colors.surfaceMuted,
            gap: 2,
        },
        gridRow: {
            flexDirection: "row",
            width: "100%",
            gap: 2,
        },
        gridCell: {
            overflow: "hidden",
            backgroundColor: colors.surfaceMuted,
        },
        gridPressable: {
            width: "100%",
        },
        gridImage: {
            width: "100%",
        },
        stackedImagesContainer: {
            width: "100%",
            gap: 12,
        },
        pairedImagesRow: {
            flexDirection: "row",
            width: "100%",
            gap: 10,
        },
        pairedImageCol: {
            flex: 1,
        },
        imageCard: {
            width: "100%",
            alignItems: "center",
        },
        imageContainer: {
            width: "100%",
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
        },
        image: {
            width: "100%",
            maxHeight: 260,
        },
        imageCaption: {
            fontFamily: "DMSans-Regular",
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 6,
            paddingHorizontal: 8,
        },
        subheaderContainer: {
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            marginBottom: 6,
        },
        subheaderText: {
            fontFamily: "DMSans-Regular",
            color: colors.textSecondary,
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
        scoreCard: {
            backgroundColor: colors.backgroundMuted,
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 16,
            marginVertical: 8,
            alignItems: "center",
        },
        scoreLabel: {
            fontFamily: "DMSans-SemiBold",
            fontSize: 11,
            color: colors.textMuted,
            letterSpacing: 1,
            marginBottom: 4,
            textTransform: "uppercase",
        },
        scoreRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
        },
        scoreCol: {
            flex: 1,
            alignItems: "center",
        },
        scoreNumber: {
            color: colors.text,
        },
        scoreDash: {
            color: colors.textMuted,
            marginHorizontal: 12,
            fontFamily: "DMSans-Regular",
        },
        portraitsRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            marginVertical: 10,
            gap: 12,
        },
        portraitCol: {
            flex: 1,
            alignItems: "center",
        },
        portraitImage: {
            borderRadius: 12,
            backgroundColor: colors.surfaceMuted,
        },
        comparisonWrapper: {
            width: "100%",
        },
        comparisonLabelContainer: {
            marginTop: 8,
            marginBottom: 2,
            paddingHorizontal: 4,
            alignItems: "center",
        },
        comparisonLabelText: {
            fontFamily: "DMSans-SemiBold",
            fontSize: 11,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },
        comparisonRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            paddingVertical: 8,
            paddingHorizontal: 4,
        },
        comparisonCol: {
            flex: 1,
            paddingHorizontal: 6,
        },
        comparisonColBorder: {
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderLeftColor: colors.backgroundMuted,
        },
        comparisonContent: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
        },
        comparisonText: {
            fontFamily: "DMSans-Regular",
            color: colors.text,
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
        rowValueContent: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
        },
        rowValueText: {
            fontFamily: "DMSans-Regular",
            color: colors.text,
        },
    });
