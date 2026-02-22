import React, { createContext, useContext } from "react";

export type RouteDepthContextValue = {
    getDepthForRouteIdx: (idx: number) => number;
};

const RouteDepthContext = createContext<RouteDepthContextValue | null>(null);

export function RouteDepthProvider({
    getDepthForRouteIdx,
    children,
}: {
    getDepthForRouteIdx: (idx: number) => number;
    children: React.ReactNode;
}): JSX.Element {
    const value: RouteDepthContextValue = { getDepthForRouteIdx };
    return (
        <RouteDepthContext.Provider value={value}>
            {children}
        </RouteDepthContext.Provider>
    );
}

export function useRouteDepth(): RouteDepthContextValue {
    const ctx = useContext(RouteDepthContext);
    if (!ctx) {
        throw new Error("useRouteDepth must be used within RouteDepthProvider");
    }
    return ctx;
}
