import React, { createContext, useContext, useState, useCallback } from "react";

type RouteSectionsContextValue = {
    sectionIdsByPath: Record<string, string[]>;
    setSectionIds: (path: string, ids: string[]) => void;
};

const RouteSectionsContext = createContext<RouteSectionsContextValue | null>(
    null
);

export function RouteSectionsProvider({
    children,
}: {
    children: React.ReactNode;
}): JSX.Element {
    const [sectionIdsByPath, setState] = useState<Record<string, string[]>>({});

    const setSectionIds = useCallback((path: string, ids: string[]) => {
        setState((prev) =>
            prev[path] === ids ? prev : { ...prev, [path]: ids }
        );
    }, []);

    const value: RouteSectionsContextValue = {
        sectionIdsByPath,
        setSectionIds,
    };

    return (
        <RouteSectionsContext.Provider value={value}>
            {children}
        </RouteSectionsContext.Provider>
    );
}

export function useRouteSections(
    path: string,
    fallbackIds: readonly string[]
): string[] {
    const ctx = useContext(RouteSectionsContext);
    if (!ctx) return [...fallbackIds];
    const custom = ctx.sectionIdsByPath[path];
    return custom && custom.length > 0 ? custom : [...fallbackIds];
}

export function useSetRouteSections(): (path: string, ids: string[]) => void {
    const ctx = useContext(RouteSectionsContext);
    return ctx?.setSectionIds ?? (() => {});
}
