import Button from "@/components/Button";
import { useScreenScroll } from "@/components/HeaderScroll";
import { ThemeColors } from "@/constants/Colors";
import { fraunces, frauncesItalic } from "@/constants/Typography";
import useTheme from "@/hooks/useTheme";
import * as Application from "expo-application";
import { Image, ImageSource } from "expo-image";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon, { IconName } from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTHOR_NAME = "Prateek Sharma";
const AUTHOR_PORTFOLIO = "https://pratk.in";
const AUTHOR_GITHUB = "https://github.com/prateekshrm";
const AUTHOR_PLAY_STORE =
    "https://play.google.com/store/apps/dev?id=5633039188314940657";
const REPOSITORY_URL = "https://github.com/prateekshrm/readwiki";
const AUTHOR_BIO = "Sofware Developer";

const AUTHOR_LINKS: { label: string; url: string; icon: IconName }[] = [
    {
        label: AUTHOR_PORTFOLIO.replace(/^https?:\/\//, ""),
        url: AUTHOR_PORTFOLIO,
        icon: "global-line",
    },
    {
        label: "@prateekshrm",
        url: AUTHOR_GITHUB,
        icon: "github-fill",
    },
    {
        label: "Play Store",
        url: AUTHOR_PLAY_STORE,
        icon: "google-play-fill",
    },
];

const WIKIPEDIA_LINKS: {
    title: string;
    subtitle: string;
    url: string;
    icon: ImageSource;
    iconSize: number;
}[] = [
    {
        title: "Wikipedia",
        subtitle: "Visit the Wikipedia website",
        url: "https://en.wikipedia.org",
        icon: require("@/assets/wikipedia-icon.png"),
        iconSize: 22,
    },
    {
        title: "Support Wikipedia",
        subtitle: "Donate or contribute to Wikipedia",
        url: "https://wikimediafoundation.org/support",
        icon: require("@/assets/wikimedia-icon.png"),
        iconSize: 20,
    },
];

export default function About() {
    const insets = useSafeAreaInsets();
    const onScroll = useScreenScroll();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.content,
                {
                    paddingBottom: insets.bottom + 32,
                },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
        >
            <View style={styles.header}>
                <Image
                    source={require("@/assets/images/splash-icon.png")}
                    style={styles.icon}
                />

                <Text style={styles.appName}>
                    <Text style={fraunces}>Read</Text>
                    <Text style={frauncesItalic}>Wiki</Text>
                </Text>

                <Text style={styles.version}>
                    Version: {Application.nativeApplicationVersion}
                </Text>

                {/* <Pressable
                    style={styles.linkChip}
                    onPress={() => Linking.openURL(REPOSITORY_URL)}
                >
                    <RemixIcon
                        name="github-fill"
                        size={16}
                        color={colors.text}
                    />
                    <Text style={styles.linkChipText}>GitHub</Text>
                </Pressable> */}

                <Button
                    text="Github"
                    iconName="github-fill"
                    onPress={() => Linking.openURL(REPOSITORY_URL)}
                    variant="secondary"
                    iconPosition="left"
                />
            </View>

            <Text style={styles.sectionTitle}>Author</Text>
            <View style={styles.authorCard}>
                <View style={styles.authorHeader}>
                    <Image
                        source={require("@/assets/profile.png")}
                        style={styles.authorAvatar}
                    />

                    <View style={styles.linkTextWrapper}>
                        <Text style={styles.linkTitle}>{AUTHOR_NAME}</Text>
                        <Text style={styles.linkSubtitle}>{AUTHOR_BIO}</Text>
                    </View>
                </View>

                <View style={styles.authorLinks}>
                    {AUTHOR_LINKS.map((link) => (
                        <Pressable
                            key={link.url}
                            style={({ pressed }) => [
                                styles.authorLink,
                                pressed && styles.authorLinkPressed,
                            ]}
                            onPress={() => Linking.openURL(link.url)}
                        >
                            <RemixIcon
                                name={link.icon}
                                size={16}
                                color={colors.text}
                            />

                            <Text style={styles.authorLinksText}>
                                {link.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <Text style={styles.sectionTitle}>WikiPedia</Text>

            {WIKIPEDIA_LINKS.map((item) => (
                <Pressable
                    key={item.url}
                    style={({ pressed }) => [
                        styles.link,
                        pressed && styles.linkPressed,
                    ]}
                    onPress={() => Linking.openURL(item.url)}
                >
                    <View style={styles.linkLeft}>
                        <View style={styles.linkIconContainer}>
                            <Image
                                source={item.icon}
                                style={{
                                    height: item.iconSize,
                                    width: item.iconSize,
                                }}
                            />
                        </View>

                        <View style={styles.linkTextWrapper}>
                            <Text style={styles.linkTitle}>{item.title}</Text>
                            <Text style={styles.linkSubtitle}>
                                {item.subtitle}
                            </Text>
                        </View>
                    </View>

                    <RemixIcon
                        name="arrow-right-s-line"
                        size={22}
                        color={colors.textSecondary}
                        fallback={null}
                    />
                </Pressable>
            ))}

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    ReadWiki is open source and uses the Wikimedia APIs to
                    provide access to Wikipedia content.
                </Text>

                <View style={styles.copyright}>
                    <RemixIcon
                        name="copyright-line"
                        size={20}
                        color={colors.textSecondary}
                        fallback={null}
                    />
                    <Text style={styles.copyrightText}>
                        {new Date().getFullYear()} {AUTHOR_NAME}
                    </Text>
                </View>
            </View>
        </Animated.ScrollView>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 20,
            paddingTop: 120,
            paddingBottom: 32,
            gap: 12,
        },
        header: {
            alignItems: "center",
            marginBottom: 16,
        },
        icon: {
            width: 88,
            height: 88,
            marginBottom: 14,
        },
        appName: {
            fontSize: 28,
            color: colors.text,
            textAlign: "center",
            marginBottom: 4,
        },
        version: {
            fontFamily: "DMSans-Medium",
            color: colors.textSecondary,
            marginBottom: 16,
        },
        sectionTitle: {
            fontSize: 14,
            fontFamily: "DMSans-SemiBold",
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginTop: 8,
            marginLeft: 4,
        },
        authorCard: {
            backgroundColor: colors.surface,
            padding: 12,
            borderRadius: 20,
        },
        authorHeader: {
            flexDirection: "row",
            alignItems: "center",
        },
        authorAvatar: {
            width: 48,
            height: 36,
            borderRadius: 999,
            marginRight: 12,
        },
        authorLinks: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundMuted,
        },
        authorLink: {
            flexDirection: "row",
            gap: 6,
            alignItems: "center",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: colors.backgroundMuted,
        },
        authorLinkPressed: {
            backgroundColor: colors.surfaceMuted,
            transform: [{ scale: 0.98 }],
        },
        authorLinksText: {
            fontSize: 13,
            color: colors.text,
            fontFamily: "DMSans-Medium",
        },
        link: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 999,
            backgroundColor: colors.surface,
        },
        linkPressed: {
            backgroundColor: colors.surfaceMuted,
        },
        linkLeft: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
        },
        linkIconContainer: {
            width: 48,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.backgroundMuted,
            marginRight: 12,
        },
        linkTextWrapper: {
            flex: 1,
        },
        linkTitle: {
            fontSize: 16,
            fontFamily: "DMSans-SemiBold",
            color: colors.text,
        },
        linkSubtitle: {
            fontSize: 13,
            fontFamily: "DMSans-Regular",
            color: colors.textSecondary,
        },
        footer: {
            marginTop: 16,
            alignItems: "center",
        },
        footerText: {
            textAlign: "center",
            lineHeight: 22,
            color: colors.textSecondary,
            fontFamily: "DMSans-Regular",
        },
        copyright: {
            marginTop: 16,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
        },
        copyrightText: {
            fontFamily: "DMSans-Medium",
            color: colors.textSecondary,
        },
    });
