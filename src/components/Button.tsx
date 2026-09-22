import { useTheme } from "@/hooks/useTheme";
import { Pressable, StyleSheet, Text } from "react-native";
import RemixIcon from "react-native-remix-icon";

interface ButtonProps {
    text: string;
    iconName?: string;
    iconPosition?: "left" | "right";
    // "primary" is a filled button; "secondary" is an outlined button.
    variant?: "primary" | "secondary";
    // Only affects the primary variant: "light" for dark backgrounds
    // (e.g. over images), "dark" for light backgrounds.
    mode?: "light" | "dark";
    onPress: () => void;
}

const Button = ({
    text,
    iconName,
    iconPosition = "right",
    variant = "primary",
    mode = "dark",
    onPress,
}: ButtonProps) => {
    const { colors } = useTheme();
    const isPrimary = variant === "primary";

    // Primary buttons are used on dark surfaces (e.g. featured hero cards), so they are always white.
    const backgroundColor = isPrimary ? "#FFFFFF" : colors.backgroundMuted;
    const textColor = isPrimary ? "#111827" : colors.text;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                { backgroundColor },
                pressed && styles.buttonPressed,
            ]}
            onPress={onPress}
        >
            {!!iconName && iconPosition === "left" && (
                <RemixIcon
                    name={iconName as any}
                    size={18}
                    color={textColor}
                    fallback={null}
                />
            )}

            <Text style={[styles.buttonText, { color: textColor }]}>
                {text}
            </Text>

            {!!iconName && iconPosition === "right" && (
                <RemixIcon
                    name={iconName as any}
                    size={18}
                    color={textColor}
                    fallback={null}
                />
            )}
        </Pressable>
    );
};

export default Button;

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
    },

    buttonPressed: {
        filter: "brightness(0.9)",
        transform: [{ scale: 0.98 }],
    },

    buttonText: {
        fontFamily: "DMSans-SemiBold",
        fontSize: 14,
    },
});
