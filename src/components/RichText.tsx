import { useTheme } from "@/hooks/useTheme";
import type { Span } from "@/services/articleParser";
import { router } from "expo-router";
import { StyleSheet, Text, TextStyle } from "react-native";

type RichTextProps = {
    spans: Span[];
    style?: TextStyle | TextStyle[];
};

// Opens a linked Wikipedia article inside the app.
const openArticle = (title: string) => {
    router.push({
        pathname: "/article/[article]",
        params: { article: title },
    });
};

// Renders an array of inline runs as a single <Text>, keeping bold /
// italic formatting and turning wiki links into tappable text that opens
// the linked article in the app.
const RichText = ({ spans, style }: RichTextProps) => {
    const { colors } = useTheme();

    return (
        <Text style={style}>
            {spans.map((span, index) => {
                const runStyle: TextStyle = {};

                if (span.bold) runStyle.fontFamily = "DMSans-Bold";
                if (span.italic) runStyle.fontStyle = "italic";

                if (span.link) {
                    return (
                        <Text
                            key={index}
                            style={[
                                styles.link,
                                { color: colors.link },
                                runStyle,
                            ]}
                            onPress={() => openArticle(span.link as string)}
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
