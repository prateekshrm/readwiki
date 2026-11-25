import { useScreenScroll } from "@/components/HeaderScroll";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import {
    getNotificationPermissionStatus,
    scheduleTomorrowFeaturedNotification,
    sendTestNotification,
} from "@/services/notification";
import { clearHistory, useHistory } from "@/stores/articleHistory.store";
import { useLayoutStore } from "@/stores/layout.store";
import { useModalStore } from "@/stores/modal.store";
import {
    FONT_SCALES,
    setPreference,
    usePreferencesStore,
} from "@/stores/preferences.store";
import {
    clearSavedArticles,
    useSavedArticles,
} from "@/stores/savedArticles.store";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    AppState,
    Linking,
    Pressable,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon, { IconName } from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Types

type SettingsItem =
    | {
          type: "theme";
          title: string;
          description: string;
          icon: IconName;
      }
    | {
          type: "textSize";
          title: string;
          description: string;
          icon: IconName;
      }
    | {
          type: "navigation";
          title: string;
          description: string;
          icon: IconName;
          onPress: () => void;
          disabled?: boolean;
          rightIcon?: IconName;
          rightIconColor?: string;
      };

type SettingsSection = {
    title: string;
    items: SettingsItem[];
};

const Settings = () => {
    const insets = useSafeAreaInsets();

    const { showModal } = useModalStore();

    const { colors, colorScheme } = useTheme();
    const preferences = usePreferencesStore();
    const savedArticles = useSavedArticles();
    const history = useHistory();
    const onScroll = useScreenScroll();

    const styles = useMemo(() => createStyles(colors), [colors]);

    const tabBarHeight = useLayoutStore((state) => state.tabBarHeight);

    const [permissionStatus, setPermissionStatus] = useState<
        "granted" | "denied" | "undetermined" | "unsupported" | "loading"
    >("loading");

    const [sendingTest, setSendingTest] = useState(false);

    // Notifications

    const checkPermission = async () => {
        const status = await getNotificationPermissionStatus();
        setPermissionStatus(status);

        if (status !== "unsupported") {
            const isGranted = status === "granted";

            setPreference(
                "notificationPermission",
                isGranted ? "granted" : "denied",
            );

            if (isGranted) {
                await scheduleTomorrowFeaturedNotification();
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            void checkPermission();
        }, 0);

        const subscription = AppState.addEventListener(
            "change",
            (nextAppState) => {
                if (nextAppState === "active") {
                    void checkPermission();
                }
            },
        );

        return () => {
            clearTimeout(timer);
            subscription.remove();
        };
    }, []);

    const handleOpenNotificationSettings = () => {
        if (permissionStatus === "unsupported") return;

        void Linking.openSettings();
    };

    const handleTestNotification = async () => {
        if (sendingTest) return;

        setSendingTest(true);

        try {
            const result = await sendTestNotification();

            if (!result.success && permissionStatus === "denied") {
                showModal({
                    title: "Notification Permission Required",
                    message: result.message,
                    confirmButton: {
                        label: "Open Settings",
                        onPress: () => {
                            void Linking.openSettings();
                        },
                    },
                    dismissButton: { label: "Cancel" },
                });
            } else {
                showModal({
                    title: result.success ? "Test Notification" : "Notice",
                    message: result.message,
                    confirmButton: {
                        label: "OK",
                    },
                });
            }

            void checkPermission();
        } finally {
            setSendingTest(false);
        }
    };

    const getPermissionsettingDescription = () => {
        if (permissionStatus === "unsupported") {
            return "Not supported on this device";
        }

        if (permissionStatus === "granted") {
            return "Notifications enabled";
        }

        return "Notifications disabled";
    };

    // Library

    const confirmClearSaved = () => {
        if (savedArticles.length === 0) return;

        showModal({
            title: "Clear Saved Articles",
            message:
                savedArticles.length > 1
                    ? `Remove all ${savedArticles.length} saved articles? This cannot be undone.`
                    : `Remove ${savedArticles.length} saved article? This cannot be undone.`,
            confirmButton: {
                label: "Clear",
                variant: "destructive",
                onPress: clearSavedArticles,
            },
            dismissButton: { label: "Cancel" },
        });
    };

    const confirmClearHistory = () => {
        if (history.length === 0) return;

        showModal({
            title: "Clear History",
            message:
                history.length > 1
                    ? `Remove all ${history.length} articles from history? This cannot be undone.`
                    : `Remove ${history.length} article from history? This cannot be undone.`,
            confirmButton: {
                label: "Clear",
                variant: "destructive",
                onPress: clearHistory,
            },
            dismissButton: { label: "Cancel" },
        });
    };

    // Support

    const APP_URL =
        "https://play.google.com/store/apps/details?id=com.pratksharma.readwiki";

    const handleRateApp = () => {
        void Linking.openURL(APP_URL);
    };

    const handleShareApp = async () => {
        try {
            await Share.share({
                message: `Discover ReadWiki – explore interesting articles and learn something new every day!\n\nDownload ReadWiki: ${APP_URL}`,
            });
        } catch (error) {
            console.error("Failed to share app:", error);
        }
    };

    const handleContactSupport = (type: "problem" | "feedback") => {
        const subject =
            type === "problem"
                ? "ReadWiki - Report a Problem"
                : "ReadWiki - Feedback";

        const url = `mailto:hello.pratk@gmail.com?subject=${encodeURIComponent(subject)}`;

        void Linking.openURL(url).catch(() => {
            showModal({
                title: "Unable to Open Email",
                message: "Please email us at hello.pratk@gmail.com",
                confirmButton: {
                    label: "OK",
                },
            });
        });
    };

    // Settings configuration

    const settingsSections: SettingsSection[] = [
        {
            title: "Appearance",
            items: [
                {
                    type: "theme",
                    title: "Theme",
                    description:
                        preferences.theme === "system"
                            ? `System (${colorScheme === "dark" ? "Dark" : "Light"})`
                            : preferences.theme === "dark"
                              ? "Dark"
                              : "Light",
                    icon: "palette-line",
                },
            ],
        },
        {
            title: "Reading",
            items: [
                {
                    type: "textSize",
                    title: "Text Size",
                    description: "Adjust how large article text appears.",
                    icon: "font-size",
                },
            ],
        },
        {
            title: "Notifications",
            items: [
                {
                    type: "navigation",
                    title: "Notification Permission",
                    description: getPermissionsettingDescription(),
                    icon:
                        permissionStatus === "granted"
                            ? "notification-4-line"
                            : "notification-off-line",
                    onPress: handleOpenNotificationSettings,
                    disabled: permissionStatus === "unsupported",
                    rightIcon:
                        permissionStatus === "granted"
                            ? "checkbox-circle-fill"
                            : permissionStatus === "unsupported"
                              ? undefined
                              : "arrow-right-s-line",
                    rightIconColor:
                        permissionStatus === "granted"
                            ? colors.accent
                            : colors.textSecondary,
                },
                {
                    type: "navigation",
                    title: "Send Test Notification",
                    description:
                        permissionStatus === "unsupported"
                            ? "Not supported on this device"
                            : "Trigger a test notification in 2 seconds",
                    icon: "notification-badge-line",
                    onPress: handleTestNotification,
                    disabled: sendingTest || permissionStatus === "unsupported",
                },
            ],
        },
        {
            title: "Library",
            items: [
                {
                    type: "navigation",
                    title: "Clear Saved Articles",
                    description:
                        savedArticles.length === 0
                            ? "No saved articles"
                            : savedArticles.length === 1
                              ? `${savedArticles.length} article`
                              : `${savedArticles.length} articles`,
                    icon: "delete-bin-line",
                    onPress: confirmClearSaved,
                    disabled: savedArticles.length === 0,
                },
                {
                    type: "navigation",
                    title: "Clear History",
                    description:
                        history.length === 0
                            ? "No reading history"
                            : history.length === 1
                              ? `${history.length} article`
                              : `${history.length} articles`,
                    icon: "delete-bin-line",
                    onPress: confirmClearHistory,
                    disabled: history.length === 0,
                },
            ],
        },
        {
            title: "Support",
            items: [
                {
                    type: "navigation",
                    title: "Rate ReadWiki",
                    description: "Enjoying the app? Leave us a rating",
                    icon: "star-smile-line",
                    onPress: handleRateApp,
                },
                {
                    type: "navigation",
                    title: "Share the app",
                    description: "Tell your friends about ReadWiki",
                    icon: "share-line",
                    onPress: handleShareApp,
                },
                {
                    type: "navigation",
                    title: "Report a Problem",
                    description: "Let us know if something isn't working",
                    icon: "bug-line",
                    onPress: () => handleContactSupport("problem"),
                },
                {
                    type: "navigation",
                    title: "Send Feedback",
                    description: "Share suggestions to improve ReadWiki",
                    icon: "feedback-line",
                    onPress: () => handleContactSupport("feedback"),
                },
            ],
        },
        {
            title: "General",
            items: [
                {
                    type: "navigation",
                    title: "Onboarding",
                    description: "View the welcome screen again",
                    icon: "compass-3-line",
                    rightIcon: "arrow-right-s-line",
                    onPress: () => router.navigate("/onboarding"),
                },
                {
                    type: "navigation",
                    title: "About",
                    description: "Learn more about ReadWiki",
                    icon: "information-line",
                    rightIcon: "arrow-right-s-line",
                    onPress: () => router.navigate("/about"),
                },
            ],
        },
    ];

    // Render settings

    const renderSettingItem = (item: SettingsItem) => {
        switch (item.type) {
            case "theme":
                return (
                    <View key={item.title} style={styles.setting}>
                        <View style={styles.settingLeftContainer}>
                            <View style={styles.settingIconContainer}>
                                <RemixIcon
                                    name={item.icon}
                                    size={20}
                                    color={colors.accent}
                                    fallback={null}
                                />
                            </View>

                            <View style={styles.settingTextWrapper}>
                                <Text style={styles.settingTitle}>
                                    {item.title}
                                </Text>
                                <Text style={styles.settingDescription}>
                                    {item.description}
                                </Text>
                            </View>
                        </View>

                        <ThemeSwitcher />
                    </View>
                );

            case "textSize":
                return (
                    <View key={item.title} style={styles.textSizeSetting}>
                        {/* Same header layout as other settings */}
                        <View style={styles.settingLeftContainer}>
                            <View style={styles.settingIconContainer}>
                                <RemixIcon
                                    name={item.icon}
                                    size={20}
                                    color={colors.accent}
                                    fallback={null}
                                />
                            </View>

                            <View style={styles.settingTextWrapper}>
                                <Text style={styles.settingTitle}>
                                    {item.title}
                                </Text>
                                <Text style={styles.settingDescription}>
                                    {item.description}
                                </Text>
                            </View>
                        </View>

                        {/* Text size options */}
                        <View style={styles.chips}>
                            {FONT_SCALES.map((option) => {
                                const active =
                                    preferences.fontScale === option.value;

                                return (
                                    <Pressable
                                        key={option.label}
                                        style={[
                                            styles.chip,
                                            active && styles.chipActive,
                                        ]}
                                        onPress={() =>
                                            setPreference(
                                                "fontScale",
                                                option.value,
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                active && styles.chipTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Preview */}
                        <View style={styles.preview}>
                            <Text
                                style={[
                                    fraunces,
                                    styles.headingPreview,
                                    {
                                        fontSize: 28 * preferences.fontScale,
                                    },
                                ]}
                            >
                                Preview Heading
                            </Text>

                            <Text
                                style={[
                                    styles.paragraphPreview,
                                    {
                                        fontSize: 16 * preferences.fontScale,
                                        lineHeight: 26 * preferences.fontScale,
                                    },
                                ]}
                            >
                                This is a preview text showing how article
                                content appears with your selected font size.
                            </Text>
                        </View>
                    </View>
                );

            case "navigation":
                return (
                    <Pressable
                        key={item.title}
                        style={({ pressed }) => [
                            styles.setting,
                            item.disabled && styles.settingDisabled,
                            pressed && styles.settingPressed,
                        ]}
                        onPress={item.onPress}
                        disabled={item.disabled}
                    >
                        <View style={styles.settingLeftContainer}>
                            <View style={styles.settingIconContainer}>
                                <RemixIcon
                                    name={item.icon}
                                    size={20}
                                    color={colors.accent}
                                    fallback={null}
                                />
                            </View>

                            <View style={styles.settingTextWrapper}>
                                <Text style={styles.settingTitle}>
                                    {item.title}
                                </Text>

                                <Text style={styles.settingDescription}>
                                    {item.description}
                                </Text>
                            </View>
                        </View>

                        {item.rightIcon && (
                            <RemixIcon
                                name={item.rightIcon}
                                size={20}
                                color={
                                    item.rightIconColor ?? colors.textSecondary
                                }
                                fallback={null}
                            />
                        )}
                    </Pressable>
                );
        }
    };

    return (
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.content,
                {
                    paddingBottom: tabBarHeight + 16,
                },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
        >
            {settingsSections.map((section) => (
                <View key={section.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>

                    <View style={styles.sectionContent}>
                        {section.items.map(renderSettingItem)}
                    </View>
                </View>
            ))}
        </Animated.ScrollView>
    );
};

export default Settings;

// Styles

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            paddingTop: 120,
            gap: 20,
        },
        section: {
            gap: 12,
        },
        sectionTitle: {
            fontSize: 14,
            fontFamily: "DMSans-SemiBold",
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginLeft: 4,
        },
        sectionContent: {
            gap: 8,
        },
        textSizeSetting: {
            padding: 12,
            borderRadius: 20,
            backgroundColor: colors.surface,
        },
        preview: {},
        headingPreview: {
            color: colors.text,
            marginBottom: 8,
        },
        paragraphPreview: {
            fontFamily: "DMSans-Regular",
            color: colors.text,
        },
        chips: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginVertical: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundMuted,
        },
        chip: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: colors.backgroundMuted,
        },
        chipActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        chipText: {
            fontSize: 14,
            fontFamily: "DMSans-Medium",
            color: colors.text,
        },
        chipTextActive: {
            color: colors.textInverse,
        },
        setting: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 999,
            backgroundColor: colors.surface,
        },
        settingPressed: {
            backgroundColor: colors.surfaceMuted,
        },
        settingDisabled: {
            opacity: 0.6,
        },
        settingLeftContainer: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
        },
        settingIconContainer: {
            width: 48,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.backgroundMuted,
            marginRight: 12,
        },
        settingTextWrapper: {
            flex: 1,
        },
        settingTitle: {
            fontSize: 16,
            fontFamily: "DMSans-SemiBold",
            color: colors.text,
        },
        settingDescription: {
            fontSize: 13,
            fontFamily: "DMSans-Regular",
            color: colors.textSecondary,
        },
    });
