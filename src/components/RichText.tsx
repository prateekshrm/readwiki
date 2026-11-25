import { useTheme } from "@/hooks/useTheme";
import type { Span } from "@/services/articleParser";
import { router } from "expo-router";
import { memo, useCallback } from "react";
import { Linking, StyleSheet, Text, TextStyle } from "react-native";

type RichTextProps = {
    spans: Span[];
    style?: TextStyle | TextStyle[];
    onLinkPress?: (title: string) => void;
    linkColor?: string;
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

type RichTextLinkProps = {
    text: string;
    link: string;
    color: string;
    runStyle: TextStyle;
    onLinkPress?: (title: string) => void;
};

const RichTextLink = memo(
    ({ text, link, color, runStyle, onLinkPress }: RichTextLinkProps) => {
        const handlePress = useCallback(() => {
            handlePressLink(link, onLinkPress);
        }, [link, onLinkPress]);

        return (
            <Text
                style={[styles.link, { color }, runStyle]}
                onPress={handlePress}
            >
                {text}
            </Text>
        );
    },
);

RichTextLink.displayName = "RichTextLink";

// Renders an array of inline runs as a single <Text>, keeping bold /
// italic formatting and turning wiki and external links into tappable text.
const RichText = memo(
    ({ spans, style, onLinkPress, linkColor }: RichTextProps) => {
        const { colors } = useTheme();
        const resolvedLinkColor = linkColor ?? colors.link;

        if (spans.length === 0) {
            return null;
        }

        // Fast path for plain single-span text to avoid nested <Text> nodes.
        if (spans.length === 1) {
            const single = spans[0];
            if (!single.link && !single.bold && !single.italic) {
                return <Text style={style}>{single.text}</Text>;
            }
        }

        return (
            <Text style={style}>
                {spans.map((span, index) => {
                    const runStyle: TextStyle = {
                        ...(span.bold && { fontFamily: "DMSans-Bold" }),
                        ...(span.italic && { fontStyle: "italic" }),
                    };

                    if (span.link) {
                        return (
                            <RichTextLink
                                key={index}
                                text={span.text}
                                link={span.link}
                                color={resolvedLinkColor}
                                runStyle={runStyle}
                                onLinkPress={onLinkPress}
                            />
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
    },
);

RichText.displayName = "RichText";

export default RichText;

const styles = StyleSheet.create({
    link: {
        fontFamily: "DMSans-SemiBold",
        textDecorationLine: "underline",
    },
});
