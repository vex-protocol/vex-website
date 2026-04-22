import type { JSX } from "preact";
import { RoutePanel } from "../components/RoutePanel";

const COMMERCIAL_EMAIL = "licensing@vex.wtf";
const MAILTO = `mailto:${COMMERCIAL_EMAIL}?subject=${encodeURIComponent(
    "Vex commercial license inquiry"
)}`;

export function LicensingPage(_: { path?: string }): JSX.Element {
    return (
        <RoutePanel splotch="tilt">
            <h1 className="mt-0 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                Commercial licensing & support
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                The Vex SDK and related projects are available under{" "}
                <strong className="font-semibold text-zinc-100">
                    AGPL-3.0
                </strong>{" "}
                for open-source use. For proprietary products, redistribution
                without copyleft, or other commercial terms, please reach out
                directly. We offer custom licensing, technical and integration
                support for our software. Please contact us for more
                information.
            </p>
            <p className="mt-6 text-zinc-300">
                <a
                    href={MAILTO}
                    className="inline-flex items-center rounded-lg border border-[#e70000]/40 bg-[#e70000]/10 px-4 py-3 text-base font-medium text-[#ff6b6b] transition-colors hover:border-[#e70000]/60 hover:bg-[#e70000]/20"
                >
                    {COMMERCIAL_EMAIL}
                </a>
            </p>
        </RoutePanel>
    );
}
