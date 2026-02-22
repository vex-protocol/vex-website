import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";

const STORAGE_KEY = "vex-invert-vertical-swipe";

/** Default: inverted (swipe up = next section, swipe down = prev) */
const DEFAULT_INVERTED = true;

type InvertVerticalContextValue = [boolean, (value: boolean) => void];

const InvertVerticalContext = createContext<InvertVerticalContextValue | null>(
    null
);

export function InvertVerticalProvider({
    children,
}: {
    children: React.ReactNode;
}): JSX.Element {
    const [inverted, setInvertedState] = useState(DEFAULT_INVERTED);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored !== null) {
                setInvertedState(stored === "true");
            }
        } catch {
            // ignore
        }
    }, []);

    const setInverted = useCallback((value: boolean) => {
        setInvertedState(value);
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
        } catch {
            // ignore
        }
    }, []);

    return (
        <InvertVerticalContext.Provider value={[inverted, setInverted]}>
            {children}
        </InvertVerticalContext.Provider>
    );
}

export function useInvertVertical(): [boolean, (value: boolean) => void] {
    const ctx = useContext(InvertVerticalContext);
    if (!ctx) {
        return [DEFAULT_INVERTED, () => {}];
    }
    return ctx;
}
