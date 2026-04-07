import type { ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";

export function App(): JSX.Element {
    const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/";
    const [HomePage, setHomePage] = useState<ComponentType<{ path?: string }> | null>(
        null
    );
    const [PrivacyPolicyPage, setPrivacyPolicyPage] = useState<
        ComponentType<{ path?: string }> | null
    >(null);

    useEffect(() => {
        if (HomePage || currentPath === "/privacy-policy") return;
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

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Navbar currentPath={currentPath} />
            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
                {currentPath === "/privacy-policy" ? (
                    PrivacyPolicyPage ? (
                        <PrivacyPolicyPage />
                    ) : (
                        <PrivacyPolicyLoading />
                    )
                ) : (
                    HomePage ? <HomePage /> : <HomePageLoading />
                )}
            </main>
            <Footer />
        </div>
    );
}

function PrivacyPolicyLoading(): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            Loading privacy policy...
        </section>
    );
}

function HomePageLoading(): JSX.Element {
    return (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-zinc-300">
            Loading...
        </section>
    );
}
