import { useState } from "preact/hooks";
import logo from "../assets/vex_icon.svg";
import { type ClaSessionValue, useClaSession } from "../ClaSessionContext";
import { LOGO_TEXT } from "../lib/brand";
import { GH_LOGIN_URL } from "../lib/githubAuth";
import { GithubIcon, MenuIcon } from "./Icons";

const LINKS = [
    { href: "/", label: "Home" },
    { href: "/licensing", label: "Licensing" },
    { href: "/privacy-policy", label: "Privacy Policy" },
];

export function Navbar(props: { currentPath: string }): JSX.Element {
    const { currentPath } = props;
    const [menuOpen, setMenuOpen] = useState(false);
    const cla = useClaSession();

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
            <nav className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <a href="/" className="inline-flex items-center gap-3">
                    <img
                        src={logo}
                        alt="Vex logo"
                        className="h-10 w-10 rounded-sm"
                    />
                    <span className="text-sm font-semibold tracking-[0.18em] text-zinc-100 sm:text-base">
                        {LOGO_TEXT}
                    </span>
                </a>

                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 text-zinc-100 lg:hidden"
                    onClick={() => setMenuOpen((value) => !value)}
                    aria-expanded={menuOpen}
                    aria-label="Toggle navigation menu"
                    title="Menu"
                >
                    <MenuIcon className="h-5 w-5" />
                </button>

                <ul className="m-0 hidden list-none items-center gap-2 p-0 lg:flex">
                    {LINKS.map((link) => (
                        <li key={link.href} className="list-none">
                            <NavItem
                                href={link.href}
                                label={link.label}
                                isActive={currentPath === link.href}
                            />
                        </li>
                    ))}
                    <li className="list-none">
                        <GithubAuthNavItem cla={cla} />
                    </li>
                </ul>
            </nav>

            {menuOpen && (
                <ul className="m-0 list-none space-y-1 border-t border-white/10 px-4 py-3 lg:hidden">
                    {LINKS.map((link) => (
                        <li key={link.href} className="list-none">
                            <NavItem
                                href={link.href}
                                label={link.label}
                                isActive={currentPath === link.href}
                                onNavigate={() => setMenuOpen(false)}
                            />
                        </li>
                    ))}
                    <li className="list-none">
                        <GithubAuthNavItem
                            cla={cla}
                            onNavigate={() => setMenuOpen(false)}
                        />
                    </li>
                </ul>
            )}
        </header>
    );
}

function GithubAuthNavItem(props: {
    cla: ClaSessionValue;
    onNavigate?: () => void;
}): JSX.Element {
    const { cla, onNavigate } = props;

    if (cla.loading) {
        return (
            <span className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-500 sm:text-sm">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            </span>
        );
    }

    if (cla.authenticated && cla.login) {
        return (
            <span
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-400 sm:text-sm"
                title={`Signed in as ${cla.login}`}
            >
                <GithubIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate">@{cla.login}</span>
            </span>
        );
    }

    return (
        <a
            href={GH_LOGIN_URL}
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs uppercase tracking-[0.16em] no-underline transition-colors sm:text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
        >
            <GithubIcon className="h-4 w-4 shrink-0" />
            Sign in
        </a>
    );
}

function NavItem(props: {
    href: string;
    label: string;
    isActive: boolean;
    onNavigate?: () => void;
}): JSX.Element {
    const { href, label, isActive, onNavigate } = props;

    return (
        <a
            href={href}
            onClick={onNavigate}
            className={[
                "inline-flex rounded-md px-3 py-2 text-xs uppercase tracking-[0.16em] no-underline transition-colors sm:text-sm",
                isActive
                    ? "bg-[#e70000]/20 text-[#e70000]"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white",
            ].join(" ")}
        >
            {label}
        </a>
    );
}
