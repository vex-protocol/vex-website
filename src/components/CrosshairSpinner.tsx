import type { JSX } from "preact";

type CrosshairSpinnerProps = {
    className?: string;
    /** Affects overall icon size. Default: `h-5 w-5`. */
    sizeClassName?: string;
    /** Use when the spinner is decorative next to a visible “Loading” label. */
    decorative?: boolean;
};

/**
 * Reticle with four cardinal tick marks, a small red “impact” dot, and a clocking range arm
 * (reads like a scope / target crosshair instead of a generic circular spinner).
 */
export function CrosshairSpinner({
    className = "",
    sizeClassName = "h-5 w-5",
    decorative = true,
}: CrosshairSpinnerProps): JSX.Element {
    return (
        <svg
            className={`shrink-0 ${sizeClassName} text-zinc-200 ${className}`.trim()}
            viewBox="0 0 24 24"
            fill="none"
            role={decorative ? "presentation" : "img"}
            aria-hidden={decorative}
        >
            <g
                className="text-zinc-500"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
            >
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
            </g>
            <g transform="translate(12, 12)">
                <g className="origin-[0px_0px] animate-spin duration-[1.15s] motion-reduce:animate-none">
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="-7.5"
                        stroke="currentColor"
                        className="text-zinc-100"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </g>
            </g>
            <circle
                className="fill-[#e70000]/50"
                cx="12"
                cy="12"
                r="1.5"
            />
        </svg>
    );
}
