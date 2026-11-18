import { useModalStore } from "@/stores/modal.store";
import NetInfo from "@react-native-community/netinfo";
import * as IntentLauncher from "expo-intent-launcher";
import { useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";

export default function useNetworkAlert() {
    const { showModal } = useModalStore();

    const alertVisible = useRef(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const connected = Boolean(state.isConnected);

            if (connected) {
                alertVisible.current = false;
                return;
            }

            if (alertVisible.current) return;

            alertVisible.current = true;

            showModal({
                title: "No Internet Connection",
                message:
                    "Please enable Wi-Fi or mobile data to continue using ReadWiki.",
                confirmButton: {
                    label: "Open Settings",
                    onPress: async () => {
                        alertVisible.current = false;

                        if (Platform.OS === "android") {
                            await IntentLauncher.startActivityAsync(
                                IntentLauncher.ActivityAction.WIRELESS_SETTINGS,
                            );
                        } else {
                            await Linking.openSettings();
                        }
                    },
                },
                dismissButton: {
                    label: "Cancel",
                    onPress: () => {
                        alertVisible.current = false;
                    },
                },
            });
        });

        return unsubscribe;
    }, []);
}
