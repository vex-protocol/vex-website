import type { ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ClaSessionProvider } from "./ClaSessionContext";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";

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

    useEffect(() => {
        if (
            HomePage ||
            currentPath === "/privacy-policy" ||
            currentPath === "/licensing" ||
            currentPath === "/cla" ||
            currentPath === "/cla-admin"
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
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            <div className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading privacy policy...</span>
            </div>
        </section>
    );
}

function LicensingPageLoading(): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            <div className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading…</span>
            </div>
        </section>
    );
}

function HomePageLoading(): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            <div className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading...</span>
            </div>
        </section>
    );
}

function ClaPageLoading(): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            <div className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading CLA…</span>
            </div>
        </section>
    );
}

function ClaAdminPageLoading(): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            <div className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                <span>Loading admin…</span>
            </div>
        </section>
    );
}
