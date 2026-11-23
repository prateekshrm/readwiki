import RichText from "@/components/RichText";
import { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { parseHtmlToSpans } from "@/utils/html";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import RemixIcon from "react-native-remix-icon";

type DidYouKnowCardProps = {
    html?: string;
    text?: string;
    onLinkPress?: (title: string) => void;
};

export default function DidYouKnowCard({
    html,
    text,
    onLinkPress,
}: DidYouKnowCardProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const spans = useMemo(() => {
        if (html) {
            const parsed = parseHtmlToSpans(html);
            if (parsed.length > 0) return parsed;
        }
        if (text) {
            return [{ text }];
        }
        return [];
    }, [html, text]);

    return (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <RemixIcon
                    name="lightbulb-line"
                    size={18}
                    color={colors.accent}
                    fallback={null}
                />
            </View>

            <View style={styles.factContainer}>
                <RichText
                    spans={spans}
                    style={styles.fact}
                    onLinkPress={onLinkPress}
                />
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            flexDirection: "row",
            marginTop: 12,
            marginHorizontal: 16,
        },

        iconContainer: {
            width: 48,
            height: 36,
            borderRadius: 999,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.backgroundMuted,
            marginRight: 12,
        },

        factContainer: {
            flex: 1,
            justifyContent: "center",
        },

        fact: {
            fontSize: 16,
            lineHeight: 24,
            fontFamily: "DMSans-Regular",
            color: colors.text,
        },
    });
