import DidYouKnowCard from "@/components/DidYouKnowCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import Loader from "@/components/Loader";
import NoInternetView from "@/components/NoInternetView";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import useTheme from "@/hooks/useTheme";
import { getFeaturedData } from "@/services/wikipedia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DidYouKnow = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(true);
    const [facts, setFacts] = useState<any[]>([]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const prevConnectedRef = useRef<boolean | null>(null);

    const loadData = useCallback(async () => {
        try {
            const data = await getFeaturedData();
            setFacts(data?.dyk || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refetch when internet arrives
    useEffect(() => {
        if (prevConnectedRef.current === false && isConnected === true) {
            setLoading(true);
            loadData();
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected, loadData]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <Loader />
            </View>
        );
    }

    if (facts.length === 0) {
        if (!isConnected) {
            return (
                <View style={styles.container}>
                    <NoInternetView
                        onRetry={() => {
                            setLoading(true);
                            loadData();
                        }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <NoInternetView
                    iconName="refresh-line"
                    title="No Facts Available"
                    description="Could not load facts right now. Please try again."
                    onRetry={() => {
                        setLoading(true);
                        loadData();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={facts}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => `${item.story}-${index}`}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                renderItem={({ item, index }) => (
                    <DidYouKnowCard text={item.text} key={index} />
                )}
            />
        </View>
    );
};

export default DidYouKnow;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        loaderContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
        },

        listContent: {
            paddingTop: 100,
        },
    });
