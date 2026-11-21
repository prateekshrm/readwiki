import { clearAllCache } from "@/services/cache";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

let globalHasInternet: boolean | null = null;
let listenerInitialized = false;

function initGlobalNetworkListener() {
    if (listenerInitialized) return;
    listenerInitialized = true;

    NetInfo.fetch().then((state) => {
        const hasInternet =
            state.isConnected !== false && state.isInternetReachable !== false;
        globalHasInternet = hasInternet;
    });

    NetInfo.addEventListener((state: NetInfoState) => {
        const hasInternet =
            state.isConnected !== false && state.isInternetReachable !== false;

        // When internet transitions from disconnected to reconnected, invalidate cache
        if (globalHasInternet === false && hasInternet === true) {
            clearAllCache();
        }

        globalHasInternet = hasInternet;
    });
}

initGlobalNetworkListener();

export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState<boolean>(
        globalHasInternet ?? true,
    );

    useEffect(() => {
        const checkState = (state: NetInfoState) => {
            const hasInternet =
                state.isConnected !== false &&
                state.isInternetReachable !== false;
            setIsConnected(hasInternet);
        };

        const unsubscribe = NetInfo.addEventListener(checkState);

        NetInfo.fetch().then(checkState);

        return unsubscribe;
    }, []);

    return isConnected;
}

export default useNetworkStatus;
