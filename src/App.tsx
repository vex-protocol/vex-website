import Router from "preact-router";
import { useState } from "preact/hooks";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";

export function App(): JSX.Element {
    const [currentPath, setCurrentPath] = useState(
        typeof window !== "undefined" ? window.location.pathname : "/"
    );

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
                    <PrivacyPolicyPage path="/privacy-policy" />
                    <HomePage default />
                </Router>
            </main>
            <Footer />
        </div>
    );
}
