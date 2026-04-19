import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { fetchGithubSession } from "./lib/githubAuth";

export type ClaSessionValue = {
    loading: boolean;
    authenticated: boolean;
    login: string | null;
    refresh: () => Promise<void>;
};

const ClaSessionContext = createContext<ClaSessionValue | null>(null);

export function ClaSessionProvider(props: {
    children: ComponentChildren;
}): JSX.Element {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [login, setLogin] = useState<string | null>(null);

    const refresh = async (): Promise<void> => {
        setLoading(true);
        try {
            const session = await fetchGithubSession();
            if (session.authenticated) {
                setAuthenticated(true);
                setLogin(session.login);
            } else {
                setAuthenticated(false);
                setLogin(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    return (
        <ClaSessionContext.Provider
            value={{
                loading,
                authenticated,
                login,
                refresh,
            }}
        >
            {props.children}
        </ClaSessionContext.Provider>
    );
}

export function useClaSession(): ClaSessionValue {
    const ctx = useContext(ClaSessionContext);
    if (!ctx) {
        throw new Error("useClaSession must be used within ClaSessionProvider");
    }
    return ctx;
}
