import { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import type { GalleryBlock, GalleryItem } from "@/services/articleParser";
import { usePreferencesStore } from "@/stores/preferences.store";
import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type GalleryViewProps = {
    block: GalleryBlock;
    onImagePress: (src: string) => void;
};

const CARD_HEIGHT = 180;

const GalleryCard = memo(
    ({
        item,
        fontScale,
        styles,
        onPress,
    }: {
        item: GalleryItem;
        fontScale: number;
        styles: ReturnType<typeof createStyles>;
        onPress: () => void;
    }) => {
        const rawRatio =
            item.width && item.height ? item.width / item.height : 4 / 3;
        const ratio = Math.max(0.65, Math.min(2.0, rawRatio));
        const cardWidth = Math.round(CARD_HEIGHT * ratio);

        return (
            <View style={[styles.cardItem, { width: cardWidth }]}>
                <Pressable
                    onPress={onPress}
                    style={[
                        styles.imageWrapper,
                        { width: cardWidth, height: CARD_HEIGHT },
                    ]}
                >
                    <Image
                        source={item.src}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={200}
                    />
                </Pressable>
                {!!item.caption && (
                    <Text
                        numberOfLines={3}
                        style={[
                            styles.itemCaption,
                            { fontSize: 12 * fontScale },
                        ]}
                    >
                        {item.caption}
                    </Text>
                )}
            </View>
        );
    },
);

const GalleryView = ({ block, onImagePress }: GalleryViewProps) => {
    const { colors } = useTheme();
    const fontScale = usePreferencesStore((state) => state.fontScale);
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (!block.images || block.images.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {block.images.map((item, index) => (
                    <GalleryCard
                        key={`${item.src}-${index}`}
                        item={item}
                        fontScale={fontScale}
                        styles={styles}
                        onPress={() => onImagePress(item.src)}
                    />
                ))}
            </ScrollView>

            {!!block.caption && (
                <Text
                    style={[styles.sharedCaption, { fontSize: 13 * fontScale }]}
                >
                    {block.caption}
                </Text>
            )}
        </View>
    );
};

export default memo(GalleryView);

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            marginVertical: 14,
        },
        scrollContent: {
            paddingHorizontal: 16,
            gap: 12,
        },
        cardItem: {
            flexDirection: "column",
        },
        imageWrapper: {
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: colors.backgroundMuted,
        },
        itemCaption: {
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
            marginTop: 6,
            lineHeight: 16,
        },
        sharedCaption: {
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
            marginTop: 8,
            paddingHorizontal: 16,
            lineHeight: 18,
        },
    });
