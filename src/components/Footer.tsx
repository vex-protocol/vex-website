import { CrosshairSpinner } from "./CrosshairSpinner";
import { GithubIcon, TwitterIcon } from "./Icons";
import { useClaSession } from "../ClaSessionContext";
import { COMPANY_NAME } from "../lib/brand";
import { GH_LOGIN_URL, GH_LOGOUT_URL } from "../lib/githubAuth";

export function Footer(): JSX.Element {
    const cla = useClaSession();

    return (
        <footer className="border-t border-white/10 py-6">
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 text-xs uppercase tracking-[0.16em] text-zinc-500 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{COMPANY_NAME}</span>
                    {cla.loading ? (
                        <CrosshairSpinner
                            className="text-zinc-500"
                            sizeClassName="h-3.5 w-3.5"
                        />
                    ) : cla.authenticated && cla.login ? (
                        <>
                            <span className="text-zinc-600">·</span>
                            <span className="normal-case tracking-normal text-zinc-500">
                                @{cla.login}
                            </span>
                            <a
                                href={GH_LOGOUT_URL}
                                className="text-zinc-400 no-underline transition-colors hover:text-zinc-200"
                            >
                                Log out
                            </a>
                        </>
                    ) : (
                        <a
                            href={GH_LOGIN_URL}
                            className="text-zinc-400 no-underline transition-colors hover:text-zinc-200"
                            title="Staff & contributor sign-in (GitHub)"
                        >
                            STAFF SIGN IN
                        </a>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="https://github.com/vex-protocol"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-white/15 bg-zinc-900/80 p-2 text-zinc-300 transition-colors hover:border-white/35 hover:text-white"
                        aria-label="Vex GitHub"
                        title="GitHub"
                    >
                        <GithubIcon className="h-4 w-4" />
                    </a>
                    <a
                        href="https://twitter.com/vexwtf7"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-white/15 bg-zinc-900/80 p-2 text-zinc-300 transition-colors hover:border-white/35 hover:text-white"
                        aria-label="Vex Twitter"
                        title="@vexwtf7"
                    >
                        <TwitterIcon className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
