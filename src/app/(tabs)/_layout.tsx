import Header from "@/components/Header";
import TabBar from "@/components/TabBar";
import useTheme from "@/hooks/useTheme";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import RemixIcon from "react-native-remix-icon";

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

export default function RootLayout() {
    const { colors } = useTheme();
    const TAB_ICON_SIZE = 18;
    return (
        <Tabs
            tabBar={renderTabBar}
            screenOptions={{
                headerTransparent: true,
                header: ({ options }) => (
                    <Header
                        title={options.title ?? ""}
                        rightComponent={
                            options.headerRight?.({
                                tintColor: "#fff",
                                canGoBack: false,
                            }) ?? null
                        }
                    />
                ),
                sceneStyle: { backgroundColor: colors.background },
                animation: "fade",
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "ReadWiki",
                    tabBarLabel: "Home",
                    tabBarIcon: ({ focused, color }) => (
                        <RemixIcon
                            name={focused ? "home-4-fill" : "home-4-line"}
                            size={TAB_ICON_SIZE}
                            color={color as string}
                            fallback={null}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="search"
                options={{
                    title: "Search",
                    tabBarIcon: ({ focused, color }) => (
                        <RemixIcon
                            name={focused ? "search-2-fill" : "search-2-line"}
                            size={TAB_ICON_SIZE}
                            color={color as string}
                            fallback={null}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="flow"
                options={{
                    title: "Flow",
                }}
            />

            <Tabs.Screen
                name="library"
                options={{
                    title: "Library",
                    tabBarIcon: ({ focused, color }) => (
                        <RemixIcon
                            name={
                                focused ? "book-shelf-fill" : "book-shelf-line"
                            }
                            size={TAB_ICON_SIZE}
                            color={color as string}
                            fallback={null}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ focused, color }) => (
                        <RemixIcon
                            name={
                                focused ? "settings-3-fill" : "settings-3-line"
                            }
                            size={TAB_ICON_SIZE}
                            color={color as string}
                            fallback={null}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
