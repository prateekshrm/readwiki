import { useTheme } from "@/hooks/useTheme";
import type { Span } from "@/services/articleParser";
import { router } from "expo-router";
import { Linking, StyleSheet, Text, TextStyle } from "react-native";

type RichTextProps = {
    spans: Span[];
    style?: TextStyle | TextStyle[];
    onLinkPress?: (title: string) => void;
};

// Opens a linked Wikipedia article inside the app.
const openArticle = (title: string) => {
    router.navigate({
        pathname: "/article/[article]",
        params: { article: title },
    });
};

const handlePressLink = async (
    link: string,
    onLinkPress?: (title: string) => void,
) => {
    if (/^https?:\/\//i.test(link)) {
        try {
            await Linking.openURL(link);
        } catch (error) {
            console.log("Failed to open external link:", error);
        }
    } else if (onLinkPress) {
        onLinkPress(link);
    } else {
        openArticle(link);
    }
};

// Renders an array of inline runs as a single <Text>, keeping bold /
// italic formatting and turning wiki and external links into tappable text.
const RichText = ({ spans, style, onLinkPress }: RichTextProps) => {
    const { colors } = useTheme();

    return (
        <Text style={style}>
            {spans.map((span, index) => {
                const runStyle: TextStyle = {
                    ...(span.bold && { fontFamily: "DMSans-Bold" }),
                    ...(span.italic && { fontStyle: "italic" }),
                };

                if (span.link) {
                    return (
                        <Text
                            key={index}
                            style={[
                                styles.link,
                                { color: colors.link },
                                runStyle,
                            ]}
                            onPress={() =>
                                handlePressLink(
                                    span.link as string,
                                    onLinkPress,
                                )
                            }
                        >
                            {span.text}
                        </Text>
                    );
                }

                return (
                    <Text key={index} style={runStyle}>
                        {span.text}
                    </Text>
                );
            })}
        </Text>
    );
};

export default RichText;

const styles = StyleSheet.create({
    link: {
        fontFamily: "DMSans-SemiBold",
        textDecorationLine: "underline",
    },
});
