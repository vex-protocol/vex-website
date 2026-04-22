import type { ComponentChildren, JSX } from "preact";

/**
 * Splotch placement presets — same red blur language as the home / status hero cards.
 * Each route can pick a variant for subtle variety while staying cohesive.
 */
export type RoutePanelSplotch = "home" | "status" | "tilt" | "soft";

const SplotchContent: Record<RoutePanelSplotch, { a: string; b: string }> = {
    home: {
        a:
            "absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#e70000]/20 blur-3xl",
        b:
            "absolute -bottom-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#e70000]/10 blur-3xl",
    },
    status: {
        a:
            "absolute -left-20 -top-24 h-52 w-52 rounded-full bg-[#e70000]/20 blur-3xl",
        b:
            "absolute -bottom-28 right-16 h-56 w-56 rounded-full bg-[#e70000]/10 blur-3xl",
    },
    tilt: {
        a:
            "absolute -right-16 top-1/3 h-48 w-48 -translate-y-1/2 rounded-full bg-[#e70000]/16 blur-3xl",
        b:
            "absolute -left-12 -bottom-8 h-44 w-44 rounded-full bg-[#e70000]/11 blur-3xl",
    },
    soft: {
        a:
            "absolute right-0 top-0 h-64 w-64 translate-x-1/4 -translate-y-1/4 rounded-full bg-[#e70000]/12 blur-3xl",
        b:
            "absolute left-1/4 bottom-0 h-52 w-52 -translate-x-1/2 translate-y-1/3 rounded-full bg-[#e70000]/8 blur-3xl",
    },
};

export type RoutePanelProps = {
    children: ComponentChildren;
    className?: string;
    splotch?: RoutePanelSplotch;
    /** When true, wraps the panel in `<section class="space-y-6">` like Home / Status. */
    withSection?: boolean;
    /**
     * Status page uses overflow-visible on the card so uptime tooltips are not clipped.
     * Other routes use overflow-hidden to match the home hero.
     */
    cardOverflowVisible?: boolean;
};

/** Card padding: matches the licensing page (source of truth for route panels). */
const cardBaseClass =
    "relative rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-10";

function RoutePanelInner(props: {
    splotch: RoutePanelSplotch;
    cardClassName?: string;
    cardOverflowVisible: boolean;
    children: ComponentChildren;
}): JSX.Element {
    const o = SplotchContent[props.splotch];
    const cardOverflow = props.cardOverflowVisible
        ? "overflow-visible"
        : "overflow-hidden";
    return (
        <div
            className={`${cardBaseClass} ${cardOverflow} ${
                props.cardClassName ?? ""
            }`}
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <div className={`${o.a} pointer-events-none`} />
                <div className={`${o.b} pointer-events-none`} />
            </div>
            <div className="relative z-[1]">{props.children}</div>
        </div>
    );
}

/**
 * Main content surface for marketing / legal / status pages: shared padding, border, and red accent blurs.
 */
export function RoutePanel({
    children,
    className,
    splotch = "home",
    withSection = true,
    cardOverflowVisible = false,
}: RoutePanelProps): JSX.Element {
    const inner = (
        <RoutePanelInner
            splotch={splotch}
            cardClassName={className}
            cardOverflowVisible={cardOverflowVisible}
        >
            {children}
        </RoutePanelInner>
    );
    if (withSection) {
        return <section className="space-y-6">{inner}</section>;
    }
    return inner;
}
