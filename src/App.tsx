import Router from "preact-router";
import type { ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";

export function App(): JSX.Element {
    const [currentPath, setCurrentPath] = useState(
        typeof window !== "undefined" ? window.location.pathname : "/"
    );
    const [PrivacyPolicyPage, setPrivacyPolicyPage] = useState<
        ComponentType<{ path?: string }> | null
    >(null);

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

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Navbar currentPath={currentPath} />
            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
                <Router
                    onChange={(event) => {
                        setCurrentPath(event.url);
                    }}
                >
                    <HomePage path="/" />
                    {PrivacyPolicyPage ? (
                        <PrivacyPolicyPage path="/privacy-policy" />
                    ) : (
                        <PrivacyPolicyLoading path="/privacy-policy" />
                    )}
                    <HomePage default />
                </Router>
            </main>
            <Footer />
        </div>
    );
}

function PrivacyPolicyLoading(_: { path?: string }): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            Loading privacy policy...
        </section>
    );
}
