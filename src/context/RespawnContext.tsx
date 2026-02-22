import React, { createContext, useContext, useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { invalidateRoomCache } from "../assets/orbImages";

type RespawnContextValue = {
    respawnTrigger: number;
    respawn: () => void;
    scrollToTop: () => void;
};

const RespawnContext = createContext<RespawnContextValue | null>(null);

export function RespawnProvider({
    children,
    scrollToTop,
}: {
    children: React.ReactNode;
    scrollToTop?: () => void;
}): JSX.Element {
    const history = useHistory();
    const [respawnTrigger, setRespawnTrigger] = useState(0);

    const respawn = useCallback(() => {
        invalidateRoomCache(); // all rooms – fresh orbs everywhere next visit
        history.push("/");
        setRespawnTrigger((n) => n + 1);
        // Scroll to top is handled by AppNavigator's pathname-change effect
        // but we need to clear depth param - push("/") already has no search
    }, [history]);

    const value: RespawnContextValue = {
        respawnTrigger,
        respawn,
        scrollToTop: scrollToTop ?? (() => {}),
    };

    return (
        <RespawnContext.Provider value={value}>
            {children}
        </RespawnContext.Provider>
    );
}

export function useRespawn(): RespawnContextValue {
    const ctx = useContext(RespawnContext);
    if (!ctx) {
        return {
            respawnTrigger: 0,
            respawn: () => {},
            scrollToTop: () => {},
        };
    }
    return ctx;
}
