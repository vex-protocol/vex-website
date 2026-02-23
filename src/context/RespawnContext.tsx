import React, { createContext, useContext, useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { invalidateRoomCache } from "../assets/orbImages";

type RespawnContextValue = {
    respawnTrigger: number;
    respawn: () => void;
    scrollToTop: () => void;
    /** Logo click: invalidate cache + bump respawn; caller navigates to home at top */
    logoClick: () => void;
};

const RespawnContext = createContext<RespawnContextValue | null>(null);

export function RespawnProvider({
    children,
    scrollToTop,
    logoClick,
}: {
    children: React.ReactNode;
    scrollToTop?: () => void;
    /** Called after invalidateRoomCache + bump respawnTrigger. Should navigate to /?depth=1. */
    logoClick?: () => void;
}): JSX.Element {
    const history = useHistory();
    const [respawnTrigger, setRespawnTrigger] = useState(0);

    const respawn = useCallback(() => {
        invalidateRoomCache(); // all rooms – fresh orbs everywhere next visit
        history.push({ pathname: "/", search: "?depth=1" });
        setRespawnTrigger((n) => n + 1);
        // Scroll to top is handled by AppNavigator's pathname-change effect
        // but we need to clear depth param - push("/") already has no search
    }, [history]);

    const handleLogoClick = useCallback(() => {
        invalidateRoomCache();
        setRespawnTrigger((n) => n + 1);
        logoClick?.();
    }, [logoClick]);

    const value: RespawnContextValue = {
        respawnTrigger,
        respawn,
        scrollToTop: scrollToTop ?? (() => {}),
        logoClick: handleLogoClick,
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
            logoClick: () => {},
        };
    }
    return ctx;
}
