import Button from "@/components/Button";
import Colors, { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NoInternetViewProps {
    onRetry: () => void;
    title?: string;
    description?: string;
    iconName?: string;
    forceDark?: boolean;
}

export default function NoInternetView({
    onRetry,
    title = "No Internet Connection",
    description = "Please check your Wi-Fi or mobile data connection and try again.",
    iconName = "wifi-off-line",
    forceDark = false,
}: NoInternetViewProps) {
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useTheme();
    const colors = forceDark ? Colors.dark : themeColors;
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 60,
                    paddingBottom: insets.bottom + 80,
                },
            ]}
        >
            {/* <View style={styles.card}> */}
            <View style={styles.iconContainer}>
                <RemixIcon
                    name={iconName as any}
                    size={38}
                    color={colors.accent}
                    fallback={null}
                />
            </View>
            <Text style={[fraunces, styles.title]}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <View style={styles.buttonWrapper}>
                <Button
                    text="Try Again"
                    iconName="refresh-line"
                    iconPosition="left"
                    variant="primary"
                    mode="dark"
                    onPress={onRetry}
                />
            </View>
            {/* </View> */}
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
            paddingHorizontal: 40,
        },
        iconContainer: {
            width: 108,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.backgroundMuted,
            justifyContent: "center",
            alignItems: "center",
        },
        title: {
            marginTop: 16,
            fontSize: 20,
            color: colors.text,
        },
        description: {
            marginTop: 8,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
        },
        buttonWrapper: {
            marginTop: 16,
            alignItems: "center",
        },
    });
