import type { ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ClaSessionProvider } from "./ClaSessionContext";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { RoutePanel } from "./components/RoutePanel";

export function App(): JSX.Element {
    const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/";
    const [HomePage, setHomePage] = useState<ComponentType<{
        path?: string;
    }> | null>(null);
    const [PrivacyPolicyPage, setPrivacyPolicyPage] = useState<ComponentType<{
        path?: string;
    }> | null>(null);
    const [LicensingPage, setLicensingPage] = useState<ComponentType<{
        path?: string;
    }> | null>(null);
    const [ClaPage, setClaPage] = useState<ComponentType<{
        path?: string;
    }> | null>(null);
    const [ClaAdminPage, setClaAdminPage] = useState<ComponentType<{
        path?: string;
    }> | null>(null);
    const [StatusPage, setStatusPage] = useState<ComponentType<{
        path?: string;
    }> | null>(null);

    useEffect(() => {
        if (
            HomePage ||
            currentPath === "/privacy-policy" ||
            currentPath === "/licensing" ||
            currentPath === "/cla" ||
            currentPath === "/cla-admin" ||
            currentPath === "/status"
        )
            return;
        let cancelled = false;
        void import("./pages/HomePage").then((module) => {
            if (!cancelled) {
                setHomePage(() => module.HomePage);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [HomePage, currentPath]);

    useEffect(() => {
        if (PrivacyPolicyPage || currentPath !== "/privacy-policy") return;
        let cancelled = false;
        void import("./pages/PrivacyPolicyPage").then((module) => {
            if (!cancelled) {
                setPrivacyPolicyPage(() => module.PrivacyPolicyPage);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [PrivacyPolicyPage, currentPath]);

    useEffect(() => {
        if (LicensingPage || currentPath !== "/licensing") return;
        let cancelled = false;
        void import("./pages/LicensingPage").then((module) => {
            if (!cancelled) {
                setLicensingPage(() => module.LicensingPage);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [LicensingPage, currentPath]);

    useEffect(() => {
        if (ClaPage || currentPath !== "/cla") return;
        let cancelled = false;
        void import("./pages/ClaPage").then((module) => {
            if (!cancelled) {
                setClaPage(() => module.ClaPage);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [ClaPage, currentPath]);

    useEffect(() => {
        if (ClaAdminPage || currentPath !== "/cla-admin") return;
        let cancelled = false;
        void import("./pages/ClaAdminPage").then((module) => {
            if (!cancelled) {
                setClaAdminPage(() => module.ClaAdminPage);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [ClaAdminPage, currentPath]);

    useEffect(() => {
        if (StatusPage || currentPath !== "/status") return;
        let cancelled = false;
        void import("./pages/StatusPage").then((module) => {
            if (!cancelled) {
                setStatusPage(() => module.StatusPage);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [StatusPage, currentPath]);

    return (
        <ClaSessionProvider>
            <div className="min-h-screen bg-zinc-950 text-zinc-100">
                <Navbar currentPath={currentPath} />
                <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
                    {currentPath === "/privacy-policy" ? (
                        PrivacyPolicyPage ? (
                            <PrivacyPolicyPage />
                        ) : (
                            <PrivacyPolicyLoading />
                        )
                    ) : currentPath === "/licensing" ? (
                        LicensingPage ? (
                            <LicensingPage />
                        ) : (
                            <LicensingPageLoading />
                        )
                    ) : currentPath === "/cla" ? (
                        ClaPage ? (
                            <ClaPage />
                        ) : (
                            <ClaPageLoading />
                        )
                    ) : currentPath === "/cla-admin" ? (
                        ClaAdminPage ? (
                            <ClaAdminPage />
                        ) : (
                            <ClaAdminPageLoading />
                        )
                    ) : currentPath === "/status" ? (
                        StatusPage ? (
                            <StatusPage />
                        ) : (
                            <StatusPageLoading />
                        )
                    ) : HomePage ? (
                        <HomePage />
                    ) : (
                        <HomePageLoading />
                    )}
                </main>
                <Footer />
            </div>
        </ClaSessionProvider>
    );
}

function PrivacyPolicyLoading(): JSX.Element {
    return (
        <RoutePanel splotch="soft">
            <div className="inline-flex items-center gap-2 text-zinc-300">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading privacy policy…</span>
            </div>
        </RoutePanel>
    );
}

function LicensingPageLoading(): JSX.Element {
    return (
        <RoutePanel splotch="tilt">
            <div className="inline-flex items-center gap-2 text-zinc-300">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading…</span>
            </div>
        </RoutePanel>
    );
}

function HomePageLoading(): JSX.Element {
    return (
        <RoutePanel splotch="home">
            <div className="inline-flex items-center gap-2 text-zinc-300">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading…</span>
            </div>
        </RoutePanel>
    );
}

function ClaPageLoading(): JSX.Element {
    return (
        <RoutePanel splotch="tilt">
            <div className="inline-flex items-center gap-2 text-zinc-300">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading CLA…</span>
            </div>
        </RoutePanel>
    );
}

function ClaAdminPageLoading(): JSX.Element {
    return (
        <RoutePanel splotch="status">
            <div className="inline-flex items-center gap-2 text-zinc-300">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading admin…</span>
            </div>
        </RoutePanel>
    );
}

function StatusPageLoading(): JSX.Element {
    return (
        <RoutePanel splotch="status" cardOverflowVisible>
            <div className="inline-flex items-center gap-2 text-zinc-300">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading status…</span>
            </div>
        </RoutePanel>
    );
}
