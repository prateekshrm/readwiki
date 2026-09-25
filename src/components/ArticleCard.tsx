import { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import RemixIcon, { type IconName } from "react-native-remix-icon";

type ArticleCardProps = {
    title: string;
    subtitle?: string;
    image?: string;
    tag?: string;
    onPress: () => void;
    // When provided, an action button is shown on the right (used in Saved/History to quickly remove an article).
    onRemove?: () => void;
    removeIcon?: IconName;
};

export default function ArticleCard({
    title,
    subtitle,
    image,
    tag,
    onPress,
    onRemove,
    removeIcon = "bookmark-fill",
}: ArticleCardProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
            ]}
            onPress={onPress}
        >
            {image ? (
                <Image
                    source={image}
                    style={styles.thumbnail}
                    contentFit="cover"
                />
            ) : (
                <View style={styles.fallbackImageIcon}>
                    <RemixIcon
                        name="file-list-2-line"
                        size={24}
                        color={colors.textMuted}
                        fallback={null}
                    />
                </View>
            )}

            <View style={styles.content}>
                {tag && <Text style={styles.tag}>{tag}</Text>}

                <Text style={styles.title}>{title}</Text>

                {!!subtitle && (
                    <Text style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {onRemove && (
                <Pressable
                    style={({ pressed }) => [
                        styles.pill,
                        pressed && styles.pillPressed,
                    ]}
                >
                    <Pressable onPress={onRemove}>
                        <RemixIcon
                            name={removeIcon}
                            size={20}
                            color={colors.text}
                            fallback={null}
                        />
                    </Pressable>
                </Pressable>
            )}
        </Pressable>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            position: "relative",
            flexDirection: "row",
            gap: 12,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },

        cardPressed: {
            opacity: 0.8,
        },

        thumbnail: {
            width: 72,
            height: 72,
            borderRadius: 8,
            backgroundColor: colors.backgroundMuted,
        },

        fallbackImageIcon: {
            width: 72,
            height: 72,
            borderRadius: 8,
            backgroundColor: colors.backgroundMuted,
            alignItems: "center",
            justifyContent: "center",
        },

        content: {
            flex: 1,
        },

        tag: {
            fontSize: 12,
            color: colors.textSecondary,
            backgroundColor: colors.backgroundMuted,
            fontFamily: "DMSans-SemiBold",
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: 12,
            alignSelf: "flex-start",
            marginBottom: 4,
        },

        title: {
            color: colors.text,
            fontSize: 18,
            fontFamily: "DMSans-SemiBold",
        },

        subtitle: {
            marginTop: 4,
            color: colors.textMuted,
            fontSize: 13,
            fontFamily: "DMSans-Medium",
        },

        pill: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 100,
            backgroundColor: colors.backgroundMuted,
            margin: "auto",
        },

        pillPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    });
