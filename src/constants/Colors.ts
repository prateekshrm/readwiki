// constants/colors.ts

export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const light = {
    primary: "#191919", // warm slate — filled buttons, indicators, active states
    secondary: "#6B6760", // warm gray
    accent: "#CC785C", // coral ("book cloth") — brand accent icons/links

    // Backgrounds
    background: "#f2f3e4", // warm cream
    backgroundSecondary: "#EAEBDA",
    backgroundMuted: "#e2e3cc", // darker shade of the bg — accent chips, fallbacks, icon boxes
    surface: "#FBFBF6", // warm white card
    surfaceMuted: "#EFEFE7", // warm muted surface

    // Text
    text: "#1D1B18", // warm near-black
    textSecondary: "#57534E", // warm gray
    textMuted: "#8B857B", // warm muted gray
    textInverse: "#FBFBF6",

    // Borders
    border: "#D8D7C9", // warm border tuned to the cream
    borderStrong: "#C4C3B2",

    // Status
    success: "#4D7C0F",
    warning: "#B45309",
    error: "#B91C1C",
    info: "#57534E",

    // Interactive
    link: "#AE4B2E", // deep terracotta link
    linkHover: "#8F3D25",

    // Inputs
    inputBackground: "#FBFBF6",
    inputBorder: "#D8D7C9",
    inputPlaceholder: "#A8A296",

    // Misc
    divider: "#E4E3D6",
    shadow: "rgba(25, 25, 25, 0.08)",

    // Wikipedia-inspired subtle accent
    wiki: "#CC785C",
} as const;

const dark = {
    primary: "#f2f3e4", // warm off-white for active indicators / filled buttons
    secondary: "#A39E93", // soft warm gray
    accent: "#C98A75", // soft muted warm terracotta

    // Backgrounds
    background: "#161614", // warm deep charcoal
    backgroundSecondary: "#1F1F1C",
    backgroundMuted: "#2A2A26", // chips, icon backgrounds, fallback boxes
    surface: "#21211E", // warm dark card surface
    surfaceMuted: "#2C2C27", // muted dark surface

    // Text
    text: "#F5F5F0", // warm near-white
    textSecondary: "#ABA79E", // soft warm gray
    textMuted: "#7E7970", // muted gray
    textInverse: "#161614", // inverted text on light chips

    // Borders
    border: "#2F2E29", // subtle warm dark border
    borderStrong: "#42413A",

    // Status
    success: "#65A30D",
    warning: "#D97706",
    error: "#DC2626",
    info: "#ABA79E",

    // Interactive
    link: "#C98A75", // toned down warm terracotta (less saturated)
    linkHover: "#DCA18F",

    // Inputs
    inputBackground: "#21211E",
    inputBorder: "#2F2E29",
    inputPlaceholder: "#6B665E",

    // Misc
    divider: "#2A2A26",
    shadow: "rgba(0, 0, 0, 0.4)",

    // Wikipedia-inspired subtle accent
    wiki: "#C98A75",
} as const;

export type ThemeColors = { [K in keyof typeof light]: string };

export const Colors = {
    light,
    dark,
    // Preserve default properties for backwards compatibility with static styles
    ...light,
};

export default Colors;
