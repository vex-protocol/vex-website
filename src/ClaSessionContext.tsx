import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { fetchGithubSession } from "./lib/githubAuth";

export type ClaSessionValue = {
    loading: boolean;
    authenticated: boolean;
    login: string | null;
    /** True when `/api/gh/admin/me` says this user may use admin tools (CLA admin, etc.). */
    adminAccess: boolean;
    refresh: () => Promise<void>;
};

const ClaSessionContext = createContext<ClaSessionValue | null>(null);

async function fetchAdminAccess(): Promise<boolean> {
    try {
        const res = await fetch("/api/gh/admin/me", { credentials: "include" });
        if (!res.ok) {
            return false;
        }
        const data = (await res.json()) as { admin?: boolean };
        return data.admin === true;
    } catch {
        return false;
    }
}

export function ClaSessionProvider(props: {
    children: ComponentChildren;
}): JSX.Element {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [login, setLogin] = useState<string | null>(null);
    const [adminAccess, setAdminAccess] = useState(false);

    const refresh = async (): Promise<void> => {
        setLoading(true);
        try {
            const session = await fetchGithubSession();
            if (session.authenticated) {
                setAuthenticated(true);
                setLogin(session.login);
                setAdminAccess(await fetchAdminAccess());
            } else {
                setAuthenticated(false);
                setLogin(null);
                setAdminAccess(false);
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
                adminAccess,
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
