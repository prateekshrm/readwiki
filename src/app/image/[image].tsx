import { useSolidHeader } from "@/components/HeaderScroll";
import Loader from "@/components/Loader";
import Colors from "@/constants/Colors";
import { Image as ExpoImage } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
    Pressable,
    Share,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HeaderRight = ({ image }: { image?: string }) => {
    const openInBrowser = async () => {
        if (!image) return;
        try {
            await Linking.openURL(image);
        } catch (err) {
            console.log("Failed to open image in browser:", err);
        }
    };

    const shareImage = async () => {
        if (!image) return;
        try {
            await Share.share({
                message: image,
                url: image,
            });
        } catch {
            // Dismissed share sheet
        }
    };

    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
                style={({ pressed }) => [
                    styles.headerRightButton,
                    pressed && styles.headerRightButtonPressed,
                ]}
                onPress={openInBrowser}
            >
                <RemixIcon
                    name="external-link-line"
                    size={20}
                    color={Colors.text}
                    fallback={null}
                />
            </Pressable>
            <Pressable
                style={({ pressed }) => [
                    styles.headerRightButton,
                    pressed && styles.headerRightButtonPressed,
                ]}
                onPress={shareImage}
            >
                <RemixIcon
                    name="share-line"
                    size={20}
                    color={Colors.text}
                    fallback={null}
                />
            </Pressable>
        </View>
    );
};

const ImageScreen = () => {
    const { image } = useLocalSearchParams<{
        image: string;
    }>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [isLoading, setIsLoading] = useState(true);

    // Full-screen dark viewer, so keep the header's back button white.
    useSolidHeader();

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => <HeaderRight image={image} />,
        });
    }, [navigation, image]);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1.2) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
            } else {
                scale.value = withTiming(2.5);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
            }
        });

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((event) => {
            const nextScale = savedScale.value * event.scale;
            scale.value = Math.min(Math.max(nextScale, 1), 5);
        })
        .onEnd(() => {
            if (scale.value <= 1) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
            } else if (scale.value > 5) {
                scale.value = withTiming(5);
            }
        });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((event) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + event.translationX;
                translateY.value = savedTranslateY.value + event.translationY;
            }
        })
        .onEnd(() => {
            if (scale.value <= 1) {
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
            }
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        panGesture,
        doubleTapGesture
    );

    const imageAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const handleZoomIn = () => {
        const targetScale = Math.min(scale.value + 0.5, 5);
        scale.value = withTiming(targetScale);
        if (targetScale === 1) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
        }
    };

    const handleZoomOut = () => {
        const targetScale = Math.max(scale.value - 0.5, 1);
        scale.value = withTiming(targetScale);
        if (targetScale === 1) {
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
        }
    };

    const handleResetZoom = () => {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ExpoImage
                source={image}
                style={styles.backgroundImage}
                contentFit="cover"
                blurRadius={30}
            />
            <View style={styles.overlay} />
            <View style={styles.imageContainer}>
                {isLoading && (
                    <View style={styles.loaderContainer} pointerEvents="none">
                        <Loader />
                    </View>
                )}
                <GestureDetector gesture={composedGesture}>
                    <Animated.View
                        style={[styles.imageWrapper, imageAnimatedStyle]}
                    >
                        <ExpoImage
                            source={image}
                            style={styles.mainImage}
                            contentFit="contain"
                            transition={200}
                            onLoadEnd={() => setIsLoading(false)}
                        />
                    </Animated.View>
                </GestureDetector>
            </View>

            <View
                style={[
                    styles.controlsContainer,
                    { bottom: Math.max(insets.bottom + 16, 24) },
                ]}
            >
                <Pressable
                    style={({ pressed }) => [
                        styles.controlButton,
                        pressed && styles.controlButtonPressed,
                    ]}
                    onPress={handleZoomOut}
                >
                    <RemixIcon
                        name="zoom-out-line"
                        size={22}
                        color={Colors.text}
                        fallback={null}
                    />
                </Pressable>

                <Pressable
                    style={({ pressed }) => [
                        styles.controlButton,
                        pressed && styles.controlButtonPressed,
                    ]}
                    onPress={handleResetZoom}
                >
                    <RemixIcon
                        name="restart-line"
                        size={20}
                        color={Colors.text}
                        fallback={null}
                    />
                </Pressable>

                <Pressable
                    style={({ pressed }) => [
                        styles.controlButton,
                        pressed && styles.controlButtonPressed,
                    ]}
                    onPress={handleZoomIn}
                >
                    <RemixIcon
                        name="zoom-in-line"
                        size={22}
                        color={Colors.text}
                        fallback={null}
                    />
                </Pressable>
            </View>
        </GestureHandlerRootView>
    );
};

export default ImageScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },

    backgroundImage: {
        ...StyleSheet.absoluteFill,
    },

    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0,0,0,0.75)",
    },

    imageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },

    imageWrapper: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },

    loaderContainer: {
        ...StyleSheet.absoluteFill,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },

    mainImage: {
        width: "100%",
        height: "80%",
    },

    headerRightButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 100,
        backgroundColor: Colors.backgroundMuted,
    },

    headerRightButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },

    controlsContainer: {
        position: "absolute",
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 20,
        zIndex: 10,
    },

    controlButton: {
        padding: 4,
        alignItems: "center",
        justifyContent: "center",
    },

    controlButtonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.92 }],
    },
});

