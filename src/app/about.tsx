import { useScreenScroll } from "@/components/HeaderScroll";
import { ThemeColors } from "@/constants/Colors";
import { fraunces, frauncesItalic } from "@/constants/Typography";
import useTheme from "@/hooks/useTheme";
import * as Application from "expo-application";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTHOR_NAME = "Prateek Sharma";
const AUTHOR_PORTFOLIO = "https://pratk.in";
const AUTHOR_GITHUB = "https://github.com/prateekshrm";
const REPOSITORY_URL = "https://github.com/prateekshrm/readwiki";
const AUTHOR_BIO = "Sofware Developer";

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

                <Pressable
                    style={styles.linkChip}
                    onPress={() => Linking.openURL(REPOSITORY_URL)}
                >
                    <RemixIcon
                        name="github-fill"
                        size={16}
                        color={colors.text}
                    />
                    <Text style={styles.linkChipText}>GitHub</Text>
                </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Author</Text>
            <View style={styles.authorCard}>
                <Image
                    source={require("@/assets/profile.png")}
                    style={styles.authorAvatar}
                />

                <View style={styles.authorCardContent}>
                    <Text style={styles.authorName}>{AUTHOR_NAME}</Text>

                    <Text style={styles.authorBio}>{AUTHOR_BIO}</Text>

                    <View style={styles.authorLinks}>
                        <Pressable
                            style={styles.authorLink}
                            onPress={() => Linking.openURL(AUTHOR_PORTFOLIO)}
                        >
                            <RemixIcon
                                name="global-line"
                                size={16}
                                color={colors.accent}
                            />

                            <Text style={styles.authorLinksText}>
                                {AUTHOR_PORTFOLIO.replace(/^https?:\/\//, "")}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={styles.authorLink}
                            onPress={() => Linking.openURL(AUTHOR_GITHUB)}
                        >
                            <RemixIcon
                                name="github-fill"
                                size={16}
                                color={colors.accent}
                            />

                            <Text style={styles.authorLinksText}>
                                @prateekshrm
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            <Text style={styles.sectionTitle}>WikiPedia</Text>

            <Pressable
                style={({ pressed }) => [
                    styles.link,
                    pressed && styles.linkPressed,
                ]}
                onPress={() => Linking.openURL("https://en.wikipedia.org")}
            >
                <View style={styles.linkLeft}>
                    <View style={styles.linkIconContainer}>
                        <Image
                            source={require("@/assets/wikipedia-icon.png")}
                            style={{ height: 24, width: 24 }}
                        />
                    </View>

                    <View style={styles.linkTextWrapper}>
                        <Text style={styles.linkTitle}>Wikipedia</Text>
                        <Text style={styles.linkSubtitle}>
                            Visit the Wikipedia website
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

            <Pressable
                style={({ pressed }) => [
                    styles.link,
                    pressed && styles.linkPressed,
                ]}
                onPress={() =>
                    Linking.openURL("https://wikimediafoundation.org/support")
                }
            >
                <View style={styles.linkLeft}>
                    <View style={styles.linkIconContainer}>
                        <Image
                            source={require("@/assets/wikimedia-icon.png")}
                            style={{ height: 22, width: 22 }}
                        />
                    </View>

                    <View style={styles.linkTextWrapper}>
                        <Text style={styles.linkTitle}>Support Wikipedia</Text>
                        <Text style={styles.linkSubtitle}>
                            Donate or contribute to Wikipedia
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
        },
        linkChip: {
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.backgroundMuted,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
        },
        linkChipText: {
            fontFamily: "DMSans-Medium",
            color: colors.text,
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
            flexDirection: "row",
            backgroundColor: colors.surface,
            padding: 12,
            borderRadius: 20,
        },
        authorAvatar: {
            width: 48,
            height: 36,
            borderRadius: 999,
            marginRight: 12,
        },
        authorCardContent: {
            flex: 1,
        },
        authorName: {
            fontSize: 18,
            fontFamily: "DMSans-Bold",
            color: colors.text,
        },
        authorBio: {
            color: colors.textSecondary,
            fontFamily: "DMSans-Regular",
        },
        authorLinks: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 8,
        },
        authorLink: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        authorLinksText: {
            color: colors.accent,
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
