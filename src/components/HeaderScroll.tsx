import { useFocusEffect } from "expo-router";
import { createContext, ReactNode, useCallback, useContext } from "react";
import {
    SharedValue,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useDerivedValue,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Scroll position that drives the transparent header.
//
// The header lives in the navigator (outside the screens) and reads a single
// shared scroll value updated by whichever screen is currently focused.
// Each scrollable screen keeps its own local offset so its header state is
// restored when navigating back.
// ---------------------------------------------------------------------------

const HEADER_TRANSITION_MS = 200;

// Any positive value forces the "scrolled" (white) header state.
const SOLID = 1;

type HeaderScrollContextValue = {
    scrollY: SharedValue<number>;
    setScrollY: (value: number) => void;
};

const HeaderScrollContext = createContext<HeaderScrollContextValue | null>(
    null,
);

export const HeaderScrollProvider = ({ children }: { children: ReactNode }) => {
    const scrollY = useSharedValue(0);
    const setScrollY = useCallback(
        (value: number) => {
            // eslint-disable-next-line react-hooks/immutability
            scrollY.value = value;
        },
        [scrollY],
    );

    return (
        <HeaderScrollContext.Provider value={{ scrollY, setScrollY }}>
            {children}
        </HeaderScrollContext.Provider>
    );
};

const useHeaderScrollContext = () => {
    const context = useContext(HeaderScrollContext);

    if (!context) {
        throw new Error(
            "HeaderScroll hooks must be used within HeaderScrollProvider",
        );
    }

    return context;
};

// A 0 → 1 value driving the header's appearance (0 at the top, 1 once scrolled).
// Smoothly transitions as soon as scrolling starts or returns to the top.
export const useHeaderProgress = () => {
    const { scrollY } = useHeaderScrollContext();
    const progress = useSharedValue(0);

    useAnimatedReaction(
        () => scrollY.value > 0,
        (scrolled, previous) => {
            if (previous === null) {
                progress.value = scrolled ? 1 : 0;
            } else if (scrolled !== previous) {
                progress.value = withTiming(scrolled ? 1 : 0, {
                    duration: HEADER_TRANSITION_MS,
                });
            }
        },
    );

    return progress;
};

// Immediate boolean indicating whether the active screen is scrolled (or solid).
export const useHeaderScrolled = () => {
    const { scrollY } = useHeaderScrollContext();

    return useDerivedValue(() => scrollY.value > 0);
};

// Attach the returned handler to an Animated.ScrollView / Animated.FlatList
// (`onScroll` + `scrollEventThrottle={16}`). Pass `{ solid: true }` to keep
// the header in its scrolled (white) state regardless of scroll position.
export const useScreenScroll = ({
    solid = false,
}: { solid?: boolean } = {}) => {
    const { scrollY: headerY, setScrollY } = useHeaderScrollContext();
    const localY = useSharedValue(0);

    useFocusEffect(
        useCallback(() => {
            setScrollY(solid ? SOLID : localY.value);
        }, [setScrollY, localY, solid]),
    );

    return useAnimatedScrollHandler(
        (event) => {
            // eslint-disable-next-line react-hooks/immutability
            localY.value = event.contentOffset.y;
            if (!solid) {
                // eslint-disable-next-line react-hooks/immutability
                headerY.value = event.contentOffset.y;
            }
        },
        [headerY, localY, solid],
    );
};

// Keep the header in its top state (black text, no gradient) regardless of any
// scrolling — for screens where nothing scrolls under the header (e.g. Search).
export const useStaticHeader = () => {
    const { setScrollY } = useHeaderScrollContext();

    useFocusEffect(
        useCallback(() => {
            setScrollY(0);
        }, [setScrollY]),
    );
};

// Keep the header in its scrolled state (white text + gradient) the whole time —
// for full-screen dark screens (e.g. Flow, the image viewer).
export const useSolidHeader = () => {
    useScreenScroll({ solid: true });
};
