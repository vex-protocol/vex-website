import { COMPANY_NAME } from "../lib/brand";

export function Footer(): JSX.Element {
    return (
        <footer className="border-t border-white/10 py-6">
            <div className="mx-auto w-full max-w-5xl px-4 text-xs uppercase tracking-[0.16em] text-zinc-500 sm:px-6 lg:px-8">
                {COMPANY_NAME}
            </div>
        </footer>
    );
}
