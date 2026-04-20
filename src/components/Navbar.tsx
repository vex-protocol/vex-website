import { useState } from "preact/hooks";
import logo from "../assets/vex_icon.svg";
import { useClaSession } from "../ClaSessionContext";
import { LOGO_TEXT } from "../lib/brand";
import { ADMIN_APP_LINKS } from "../lib/adminNav";
import { MenuIcon } from "./Icons";

const LINKS = [
    { href: "/", label: "Home" },
    { href: "/licensing", label: "Licensing" },
    { href: "/privacy-policy", label: "Privacy Policy" },
];

function navItemClass(isActive: boolean): string {
    return [
        "inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs uppercase tracking-[0.16em] no-underline transition-colors sm:text-sm",
        isActive
            ? "bg-[#e70000]/20 text-[#e70000]"
            : "text-zinc-300 hover:bg-white/5 hover:text-white",
    ].join(" ");
}

export function Navbar(props: { currentPath: string }): JSX.Element {
    const { currentPath } = props;
    const [menuOpen, setMenuOpen] = useState(false);
    const cla = useClaSession();

    const showAdmin = !cla.loading && cla.authenticated && cla.adminAccess;
    const adminNavActive = ADMIN_APP_LINKS.some((l) => l.href === currentPath);

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
            <nav className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <a href="/" className="inline-flex shrink-0 items-center gap-3">
                    <img
                        src={logo}
                        alt="Vex logo"
                        className="h-10 w-10 rounded-sm"
                    />
                    <span className="text-sm font-semibold tracking-[0.18em] text-zinc-100 sm:text-base">
                        {LOGO_TEXT}
                    </span>
                </a>

                <div className="flex shrink-0 items-center gap-1">
                    <ul className="m-0 hidden list-none items-center gap-1 p-0 lg:flex">
                        {showAdmin ? (
                            <li className="relative list-none">
                                <div className="group">
                                    <button
                                        type="button"
                                        className={`${navItemClass(adminNavActive)} cursor-pointer border-0 bg-transparent`}
                                        aria-haspopup="true"
                                    >
                                        Admin
                                        <span
                                            className="text-[0.65em] opacity-60"
                                            aria-hidden
                                        >
                                            ▾
                                        </span>
                                    </button>
                                    <div className="invisible absolute left-0 top-full z-[60] pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100">
                                        <div className="min-w-[13rem] rounded-md border border-white/10 bg-zinc-950 py-1 shadow-[0_0.5rem_2rem_-0.25rem_rgba(0,0,0,0.85)]">
                                            {ADMIN_APP_LINKS.map((link) => (
                                                <a
                                                    key={link.href}
                                                    href={link.href}
                                                    className={[
                                                        "block px-3 py-2.5 text-xs uppercase tracking-[0.14em] no-underline transition-colors",
                                                        currentPath === link.href
                                                            ? "bg-[#e70000]/15 text-[#e70000]"
                                                            : "text-zinc-300 hover:bg-white/5 hover:text-white",
                                                    ].join(" ")}
                                                >
                                                    {link.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ) : null}
                        {LINKS.map((link) => (
                            <li key={link.href} className="list-none">
                                <NavItem
                                    href={link.href}
                                    label={link.label}
                                    isActive={currentPath === link.href}
                                />
                            </li>
                        ))}
                    </ul>

                    <button
                        type="button"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 text-zinc-100 lg:hidden"
                        onClick={() => setMenuOpen((value) => !value)}
                        aria-expanded={menuOpen}
                        aria-label="Toggle navigation menu"
                        title="Menu"
                    >
                        <MenuIcon className="h-5 w-5" />
                    </button>
                </div>
            </nav>

            {menuOpen && (
                <ul className="m-0 list-none space-y-1 border-t border-white/10 px-4 py-3 lg:hidden">
                    {showAdmin
                        ? ADMIN_APP_LINKS.map((link) => (
                              <li key={link.href} className="list-none">
                                  <NavItem
                                      href={link.href}
                                      label={link.label}
                                      isActive={currentPath === link.href}
                                      onNavigate={() => setMenuOpen(false)}
                                  />
                              </li>
                          ))
                        : null}
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
            className={navItemClass(isActive)}
        >
            {label}
        </a>
    );
}
