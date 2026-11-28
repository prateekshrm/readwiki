import { useTheme } from "@/hooks/useTheme";
import type { Span } from "@/services/articleParser";
import { router } from "expo-router";
import { Fragment, memo, useCallback } from "react";
import { Linking, Pressable, StyleSheet, Text, TextStyle } from "react-native";

type RichTextProps = {
    spans: Span[];
    style?: TextStyle | TextStyle[];
    onLinkPress?: (title: string) => void;
    onRefPress?: (refId: string, label: string) => void;
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

type RichTextReferenceProps = {
    text: string;
    refId: string;
    color: string;
    backgroundColor: string;
    onRefPress?: (refId: string, label: string) => void;
};

const RichTextReference = memo(
    ({
        text,
        refId,
        color,
        backgroundColor,
        onRefPress,
    }: RichTextReferenceProps) => {
        const handlePress = useCallback(() => {
            onRefPress?.(refId, text);
        }, [refId, text, onRefPress]);

        const pillLabel = text.replace(/^\[|\]$/g, "");

        return (
            <Pressable
                onPress={onRefPress ? handlePress : undefined}
                disabled={!onRefPress}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                accessibilityRole="button"
                accessibilityLabel={`Reference ${pillLabel}`}
                style={({ pressed }) => [
                    styles.referencePill,
                    { backgroundColor },
                    pressed && styles.referencePillPressed,
                ]}
            >
                <Text style={[styles.referenceBadgeText, { color }]}>
                    {pillLabel}
                </Text>
            </Pressable>
        );
    },
);

RichTextReference.displayName = "RichTextReference";

// Renders an array of inline runs as a single <Text>, keeping bold /
// italic formatting and turning wiki, external, and reference links into tappable text.
const RichText = memo(
    ({ spans, style, onLinkPress, onRefPress, linkColor }: RichTextProps) => {
        const { colors } = useTheme();
        const resolvedLinkColor = linkColor ?? colors.link;

        if (spans.length === 0) {
            return null;
        }

        // Fast path for plain single-span text to avoid nested <Text> nodes.
        if (spans.length === 1) {
            const single = spans[0];
            if (
                !single.link &&
                !single.bold &&
                !single.italic &&
                !single.refId
            ) {
                return <Text style={style}>{single.text}</Text>;
            }
        }

        return (
            <Text style={style}>
                {spans.map((span, index) => {
                    if (span.refId) {
                        const prevSpan = index > 0 ? spans[index - 1] : null;
                        const needsGap =
                            prevSpan &&
                            (!!prevSpan.refId || !/\s$/.test(prevSpan.text));

                        return (
                            <Fragment key={index}>
                                {needsGap && (
                                    <Text style={styles.refSpacer}> </Text>
                                )}
                                <RichTextReference
                                    text={span.text}
                                    refId={span.refId}
                                    color={resolvedLinkColor}
                                    backgroundColor={colors.backgroundMuted}
                                    onRefPress={onRefPress}
                                />
                            </Fragment>
                        );
                    }

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
    referencePill: {
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 1.5,
        justifyContent: "center",
        alignItems: "center",
        transform: [{ translateY: 2 }],
    },
    referencePillPressed: {
        opacity: 0.6,
    },
    refSpacer: {
        fontSize: 7,
    },
    referenceBadgeText: {
        fontFamily: "DMSans-SemiBold",
        fontSize: 11.5,
        lineHeight: 14,
    },
});
