import { Github, Twitter } from "lucide-preact";
import { COMPANY_NAME } from "../lib/brand";

export function Footer(): JSX.Element {
    return (
        <footer className="border-t border-white/10 py-6">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 text-xs uppercase tracking-[0.16em] text-zinc-500 sm:px-6 lg:px-8">
                <span>{COMPANY_NAME}</span>
                <div className="flex items-center gap-2">
                    <a
                        href="https://github.com/vex-protocol"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-white/15 bg-zinc-900/80 p-2 text-zinc-300 transition-colors hover:border-white/35 hover:text-white"
                        aria-label="Vex GitHub"
                        title="GitHub"
                    >
                        <Github className="h-4 w-4" />
                    </a>
                    <a
                        href="https://twitter.com/vexwtf7"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-white/15 bg-zinc-900/80 p-2 text-zinc-300 transition-colors hover:border-white/35 hover:text-white"
                        aria-label="Vex Twitter"
                        title="@vexwtf7"
                    >
                        <Twitter className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
