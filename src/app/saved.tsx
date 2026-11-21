import ArticleCard from "@/components/ArticleCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import useTheme from "@/hooks/useTheme";
import {
    clearSavedArticles,
    removeArticle,
    useSavedArticles,
} from "@/services/savedArticles";
import { useModalStore } from "@/stores/modal.store";
import { router, useNavigation } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ClearButton = () => {
    const { showModal } = useModalStore();

    const savedArticles = useSavedArticles();
    const { colors } = useTheme();

    if (savedArticles.length === 0) return null;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.headerButton,
                { backgroundColor: colors.backgroundMuted },
                pressed && styles.headerButtonPressed,
            ]}
            onPress={() =>
                showModal({
                    title: "Clear Saved Articles",
                    message: `Remove all ${savedArticles.length} saved article(s)? This cannot be undone.`,
                    confirmButton: {
                        label: "Clear",
                        variant: "destructive",
                        onPress: clearSavedArticles,
                    },
                    dismissButton: { label: "Cancel" },
                })
            }
        >
            <RemixIcon
                name="bookmark-2-line"
                size={20}
                color={colors.text}
                fallback={null}
            />
        </Pressable>
    );
};

const Saved = () => {
    const savedArticles = useSavedArticles();
    const insets = useSafeAreaInsets();
    const onScroll = useScreenScroll();
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => <ClearButton />,
        });
    }, [navigation]);

    if (savedArticles.length === 0) {
        return (
            <View style={styles.empty}>
                <View style={styles.emptyIconContainer}>
                    <RemixIcon
                        name="bookmark-line"
                        size={38}
                        color={colors.accent}
                        fallback={null}
                    />
                </View>
                <Text style={[fraunces, styles.emptyTitle]}>
                    No Saved Articles
                </Text>
                <Text style={styles.emptySubtitle}>
                    Tap the bookmark icon while reading an article to save it
                    here for later.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={savedArticles}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 32 },
                ]}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item.title}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <ArticleCard
                        title={item.title}
                        image={item.thumbnail}
                        onPress={() =>
                            router.navigate({
                                pathname: "/article/[article]",
                                params: { article: item.title },
                            })
                        }
                        onRemove={() => removeArticle(item.title)}
                    />
                )}
            />
        </View>
    );
};

export default Saved;

const styles = StyleSheet.create({
    headerButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 100,
    },
    headerButtonPressed: {
        filter: "brightness(0.9)",
        transform: [{ scale: 0.98 }],
    },
});

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        listContent: {
            paddingTop: 100,
        },

        empty: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
            backgroundColor: colors.background,
        },

        emptyIconContainer: {
            width: 108,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.backgroundMuted,
            justifyContent: "center",
            alignItems: "center",
        },

        emptyTitle: {
            marginTop: 16,
            fontSize: 20,
            color: colors.text,
        },

        emptySubtitle: {
            marginTop: 8,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
        },
    });
