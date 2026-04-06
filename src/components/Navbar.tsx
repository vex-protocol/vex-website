import { useState } from "preact/hooks";
import logo from "../assets/vex_icon.svg";
import { LOGO_TEXT } from "../lib/brand";

const LINKS = [
    { href: "/", label: "Home" },
    { href: "/privacy-policy", label: "Privacy Policy" },
];

export function Navbar(props: { currentPath: string }): JSX.Element {
    const { currentPath } = props;
    const [menuOpen, setMenuOpen] = useState(false);

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
                    className="inline-flex rounded-md border border-white/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-100 md:hidden"
                    onClick={() => setMenuOpen((value) => !value)}
                    aria-expanded={menuOpen}
                    aria-label="Toggle navigation menu"
                >
                    Menu
                </button>

                <ul className="hidden items-center gap-2 md:flex">
                    {LINKS.map((link) => (
                        <li key={link.href}>
                            <NavItem
                                href={link.href}
                                label={link.label}
                                isActive={currentPath === link.href}
                            />
                        </li>
                    ))}
                </ul>
            </nav>

            {menuOpen && (
                <ul className="space-y-1 border-t border-white/10 px-4 py-3 md:hidden">
                    {LINKS.map((link) => (
                        <li key={link.href}>
                            <NavItem
                                href={link.href}
                                label={link.label}
                                isActive={currentPath === link.href}
                                onNavigate={() => setMenuOpen(false)}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </header>
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
                "inline-flex rounded-md px-3 py-2 text-xs uppercase tracking-[0.16em] transition-colors sm:text-sm",
                isActive
                    ? "bg-[#e70000]/20 text-[#e70000]"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white",
            ].join(" ")}
        >
            {label}
        </a>
    );
}
