import ArticleCard from "@/components/ArticleCard";
import ArticleCardSkeleton from "@/components/ArticleCardSkeleton";
import { useStaticHeader } from "@/components/HeaderScroll";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { useTheme } from "@/hooks/useTheme";
import { searchArticles } from "@/services/wikipedia";
import { useLayoutStore } from "@/stores/layout.store";
import { Platform } from "expo";
import { router, useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    FlatListInstance,
    Keyboard,
    KeyboardAvoidingView,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import RemixIcon, { type IconName } from "react-native-remix-icon";

const DEBOUNCE_MS = 400;

const Search = () => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(
        () => createStyles(colors, isDark),
        [colors, isDark],
    );

    const tabBarHeight = useLayoutStore((state) => state.tabBarHeight);
    const navigation = useNavigation();

    const flatListRef = useRef<FlatListInstance>(null);
    const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
            setKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const isConnected = useNetworkStatus();
    const [query, setQuery] = useState("");
    const [searchedQuery, setSearchedQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleQueryChange = (text: string) => {
        setQuery(text);
        const trimmed = text.trim();

        if (!trimmed || !isConnected) {
            setSearchResults([]);
            setSearchedQuery("");
            setLoading(false);
            return;
        }

        setLoading(true);
    };

    useEffect(() => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || !isConnected) return;

        let cancelled = false;

        const timeout = setTimeout(async () => {
            try {
                const data = await searchArticles(trimmedQuery);
                if (cancelled) return;

                const sortedData = [...data].sort((a, b) => a.index - b.index);
                setSearchResults(sortedData);
                setSearchedQuery(trimmedQuery);
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [query, isConnected]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const unsubscribe = navigation.addListener("tabPress" as any, () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        });

        return () => {
            if (timer) clearTimeout(timer);
            unsubscribe();
        };
    }, [navigation]);

    const clearSearch = () => {
        setQuery("");
        setSearchedQuery("");
        setSearchResults([]);
        setLoading(false);
    };

    // The results list sits below a fixed search bar, so nothing scrolls under
    // the header — keep it in its default (black, no gradient) state.
    useStaticHeader();

    const trimmedQuery = query.trim();
    const hasCompletedSearch =
        Boolean(trimmedQuery) && searchedQuery === trimmedQuery;

    const emptyState: {
        icon: IconName;
        title: string;
        subtitle: string;
    } = !isConnected
        ? {
              icon: "wifi-off-line",
              title: "You're Offline",
              subtitle: "Connect to the internet to search Wikipedia articles.",
          }
        : hasCompletedSearch
          ? {
                icon: "search-2-line",
                title: "No Articles Found",
                subtitle: `No results matched "${searchedQuery}". Try another search term.`,
            }
          : {
                icon: "compass-3-line",
                title: "Explore Wikipedia",
                subtitle:
                    "Discover articles, topics, and stories from across the free encyclopedia.",
            };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.searchContainer}>
                    <View style={styles.inputWrapper}>
                        <RemixIcon
                            name="search-2-line"
                            size={20}
                            color={colors.textMuted}
                            style={styles.leftIcon}
                            fallback={null}
                        />

                        <TextInput
                            value={query}
                            onChangeText={handleQueryChange}
                            placeholder="Search articles..."
                            placeholderTextColor={colors.textMuted}
                            style={[styles.searchInput, { color: colors.text }]}
                            returnKeyType="search"
                            ref={inputRef}
                        />

                        {query.length > 0 && (
                            <Pressable
                                onPress={clearSearch}
                                style={styles.clearButton}
                            >
                                <RemixIcon
                                    name="close-line"
                                    size={20}
                                    color={colors.textMuted}
                                    fallback={null}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>

                {loading && Boolean(trimmedQuery) && isConnected ? (
                    <ArticleCardSkeleton count={3} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={searchResults}
                        keyExtractor={(item) => item.title}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingBottom: isKeyboardVisible
                                    ? 16
                                    : tabBarHeight + 16,
                            },
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <View style={styles.emptyIconContainer}>
                                    <RemixIcon
                                        name={emptyState.icon}
                                        size={34}
                                        color={colors.accent}
                                        fallback={null}
                                    />
                                </View>
                                <Text style={[fraunces, styles.emptyTitle]}>
                                    {emptyState.title}
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {emptyState.subtitle}
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <ArticleCard
                                title={item.title}
                                subtitle={item.description}
                                image={item.thumbnail?.source}
                                onPress={() =>
                                    router.navigate({
                                        pathname: "/article/[article]",
                                        params: {
                                            article: item.title,
                                        },
                                    })
                                }
                            />
                        )}
                    />
                )}
            </KeyboardAvoidingView>
        </View>
    );
};

export default Search;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        searchContainer: {
            paddingTop: 100,
            paddingHorizontal: 16,
            marginBottom: 16,
        },

        inputWrapper: {
            position: "relative",
            justifyContent: "center",
        },

        searchInput: {
            backgroundColor: colors.surface,
            borderRadius: 100,
            paddingLeft: 44,
            paddingRight: 44,
            fontSize: 16,
            shadowColor: isDark ? "transparent" : colors.primary,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: isDark ? 0 : 6,
            elevation: isDark ? 0 : 2,
            fontFamily: "DMSans-Medium",
        },

        leftIcon: {
            position: "absolute",
            left: 12,
            zIndex: 1,
        },

        clearButton: {
            position: "absolute",
            right: 12,
            zIndex: 1,
            justifyContent: "center",
            alignItems: "center",
        },

        listContent: {
            flexGrow: 1,
        },

        empty: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
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
            textAlign: "center",
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
