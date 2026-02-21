/**
 * Orb images – auto-loaded from color folders, no duplicate images per batch.
 * Chance rates: 50% red, 30% purple, 5% green, 5% blue, 5% pink, 5% cream
 */

const COLOR_FOLDERS: Record<string, string> = {
    red: "FIRERED",
    purple: "ROYALPURPLE",
    green: "INCINERATORGREEN",
    blue: "ICEBLUE",
    pink: "PEACHPINK",
    cream: "CREAM",
    rainbow: "RAINBOW",
};

export type OrbColor = keyof typeof COLOR_FOLDERS;

/** Load all images from color folders (auto-discovers new files at build time) */
function loadAllImagesByColor(): Record<OrbColor, string[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ctx = (require as any).context(
        ".",
        true,
        /\.(jpg|jpeg|png|gif|webp)$/i
    );
    const entries = ctx.keys().map((key: string) => ({
        key,
        value: ctx(key) as string,
    }));

    const result: Record<string, string[]> = {};
    for (const [color, folder] of Object.entries(COLOR_FOLDERS)) {
        const prefix = `./${folder}/`;
        result[color] = entries
            .filter((e: { key: string; value: string }) =>
                e.key.startsWith(prefix)
            )
            .map((e: { key: string; value: string }) => e.value);
    }
    return result as Record<OrbColor, string[]>;
}

export const ORB_IMAGES_BY_COLOR = loadAllImagesByColor();

export const COLOR_CHANCES: [OrbColor, number][] = [
    ["red", 0.5],
    ["purple", 0.3],
    ["green", 0.05],
    ["blue", 0.05],
    ["pink", 0.05],
    ["cream", 0.05],
];

/** Color distribution: 50% red, 30% purple, 5% each green/blue/pink/cream, rainbow always ≥1 */
const COLOR_RATIOS: Record<OrbColor, number> = {
    red: 0.5,
    purple: 0.3,
    green: 0.05,
    blue: 0.05,
    pink: 0.05,
    cream: 0.05,
    rainbow: 0.5, // energy for rainbow (no ratio, reserved slot)
};

/** Power level (energy) per color – proportional to color ratio (red strongest, minor colors weaker) */
function getEnergyForColor(color: OrbColor): number {
    const ratio = color === "rainbow" ? 0.5 : COLOR_RATIOS[color];
    const base = ratio * 1.2;
    const jitter = (Math.random() - 0.5) * 0.25;
    return Math.max(0.05, Math.min(0.98, base + jitter));
}

/** Cached page batch – survives StrictMode remount, ensures unique orbs per section */
const PAGE_ORB_COUNTS = { hero: 4, about: 6, features: 6 } as const;
let cachedPageOrbs: Array<{
    color: OrbColor;
    image: string;
    energy: number;
}> | null = null;

function getPageOrbs(): Array<{
    color: OrbColor;
    image: string;
    energy: number;
}> {
    if (cachedPageOrbs) return cachedPageOrbs;
    const total =
        PAGE_ORB_COUNTS.hero + PAGE_ORB_COUNTS.about + PAGE_ORB_COUNTS.features;

    // Always include exactly one rainbow orb (uses RAINBOW folder images)
    const rainbowSlot = Math.floor(Math.random() * total);

    const colorSlots: OrbColor[] = [];
    const remaining = total - 1; // one slot reserved for rainbow
    const counts: Record<string, number> = {
        red: 0,
        purple: 0,
        green: 0,
        blue: 0,
        pink: 0,
        cream: 0,
    };
    for (const [color, ratio] of COLOR_CHANCES) {
        const n = Math.round(remaining * ratio);
        for (let i = 0; i < n && colorSlots.length < remaining; i++) {
            colorSlots.push(color as OrbColor);
            counts[color]++;
        }
    }
    while (colorSlots.length < remaining) colorSlots.push("red" as OrbColor);
    while (colorSlots.length > remaining) colorSlots.pop();

    // Insert rainbow at reserved index
    colorSlots.splice(rainbowSlot, 0, "rainbow");

    const usedByColor: Record<string, Set<string>> = {
        red: new Set(),
        purple: new Set(),
        green: new Set(),
        blue: new Set(),
        pink: new Set(),
        cream: new Set(),
        rainbow: new Set(),
    };

    function pickImage(color: OrbColor): string {
        const images = ORB_IMAGES_BY_COLOR[color] ?? [];
        const available = images.filter((img) => !usedByColor[color].has(img));
        if (available.length > 0) {
            const img = available[Math.floor(Math.random() * available.length)];
            usedByColor[color].add(img);
            return img;
        }
        // Rainbow must never be empty: fallback to any available image from other folders
        if (color === "rainbow") {
            const allColors: OrbColor[] = [
                "red",
                "purple",
                "green",
                "blue",
                "pink",
                "cream",
                "rainbow",
            ];
            for (const c of allColors) {
                const imgs = ORB_IMAGES_BY_COLOR[c] ?? [];
                const avail = imgs.filter((img) => !usedByColor[c].has(img));
                if (avail.length > 0) {
                    const img = avail[Math.floor(Math.random() * avail.length)];
                    usedByColor[c].add(img);
                    return img;
                }
            }
        }
        return "";
    }

    const result: Array<{
        color: OrbColor;
        image: string;
        energy: number;
    }> = [];

    for (let i = 0; i < total; i++) {
        const color = colorSlots[i];
        const energy = getEnergyForColor(color);
        const image = pickImage(color);
        result.push({ color, image, energy });
    }

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    cachedPageOrbs = result;
    return result;
}

/** Energy threshold: below this, orb does not rotate at all */
export const ENERGY_ROTATE_THRESHOLD = 0.35;

/** Get orbs for a section – no duplicates, cached for page (survives StrictMode remount) */
export function generateOrbs(
    count: number,
    section?: keyof typeof PAGE_ORB_COUNTS
): Array<{ color: OrbColor; image: string; energy: number }> {
    const all = getPageOrbs();
    if (section === "hero")
        return all.slice(0, Math.min(count, PAGE_ORB_COUNTS.hero));
    if (section === "about")
        return all.slice(
            PAGE_ORB_COUNTS.hero,
            PAGE_ORB_COUNTS.hero + Math.min(count, PAGE_ORB_COUNTS.about)
        );
    if (section === "features")
        return all.slice(
            PAGE_ORB_COUNTS.hero + PAGE_ORB_COUNTS.about,
            PAGE_ORB_COUNTS.hero +
                PAGE_ORB_COUNTS.about +
                Math.min(count, PAGE_ORB_COUNTS.features)
        );
    return all.slice(0, count);
}

/** Drift duration in s: higher energy = faster drift (shorter duration) */
export function getDriftDuration(energy: number): number {
    return 18 + (1 - energy) * 22;
}

/** Rotate duration in s when energy > threshold. Below threshold returns null. */
export function getRotateDuration(energy: number): number | null {
    if (energy < ENERGY_ROTATE_THRESHOLD) return null;
    return 25 + (1 - energy) * 20;
}
