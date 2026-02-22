/**
 * Procedural orb generation. Images must match orb color (FIRERED folder → red orb only).
 * Each image used at most once per playthrough (no duplicates anywhere).
 * Rainbow orbs never empty (fallback to any unused image if rainbow pool exhausted).
 * Color→image mapping derived from require.context keys (folder prefix → color).
 * Base change = invalidate(path). Respawn = invalidate() clears all + resets used images.
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

/** Map folder name to orb color – must match generate-orb-images.js */
const FOLDER_TO_COLOR: Record<string, OrbColor> = {
    FIRERED: "red",
    ROYALPURPLE: "purple",
    INCINERATORGREEN: "green",
    ICEBLUE: "blue",
    PEACHPINK: "pink",
    CREAM: "cream",
    RAINBOW: "rainbow",
};

/** Resolve images via require.context – use webpack's actual keys to avoid path mismatch. */
function loadOrbImagesByColor(): Record<OrbColor, string[]> {
    const ctx = (require as any).context(
        ".",
        true,
        /\.(jpg|jpeg|png|gif|webp)$/i
    );
    const result: Record<string, string[]> = {
        red: [],
        purple: [],
        green: [],
        blue: [],
        pink: [],
        cream: [],
        rainbow: [],
    };
    const keys = ctx.keys();
    for (const key of keys) {
        const match = key.match(/^\.\/([A-Za-z]+)\//);
        const folder = match?.[1];
        const color = folder ? FOLDER_TO_COLOR[folder] : undefined;
        if (!color) continue;
        try {
            const mod = ctx(key);
            const url =
                mod &&
                (typeof mod === "string"
                    ? mod
                    : (mod as { default?: string }).default);
            if (url && typeof url === "string") {
                result[color].push(url);
            }
        } catch {
            // skip
        }
    }
    // Deterministic sort per color (match generate script order)
    for (const c of Object.keys(result) as OrbColor[]) {
        result[c]!.sort((a, b) => a.localeCompare(b));
    }
    return result as Record<OrbColor, string[]>;
}

export const ORB_IMAGES_BY_COLOR = loadOrbImagesByColor();

const COLOR_CHANCES: [OrbColor, number][] = [
    ["red", 0.5],
    ["purple", 0.3],
    ["green", 0.05],
    ["blue", 0.05],
    ["pink", 0.05],
    ["cream", 0.05],
];

const COLOR_RATIOS: Record<OrbColor, number> = {
    red: 0.5,
    purple: 0.3,
    green: 0.05,
    blue: 0.05,
    pink: 0.05,
    cream: 0.05,
    rainbow: 0.5,
};

/** Room config: total orb count per room and slot offsets */
const ROOM_CONFIG: Record<
    string,
    { total: number; slots: { id: string; start: number; count: number }[] }
> = {
    "/": {
        total: 22,
        slots: [
            { id: "home-hero", start: 0, count: 4 },
            { id: "home-about", start: 4, count: 6 },
            { id: "home-features", start: 10, count: 6 },
            { id: "contact", start: 16, count: 6 },
        ],
    },
    "/download": {
        total: 12,
        slots: [
            { id: "download-hero", start: 0, count: 6 },
            { id: "download-releases", start: 6, count: 6 },
        ],
    },
    "/privacy-policy": {
        total: 48,
        slots: [
            { id: "privacy-header", start: 0, count: 6 },
            { id: "privacy-intro", start: 6, count: 6 },
            { id: "privacy-why-you-should-care", start: 12, count: 6 },
            { id: "privacy-what-is-collected", start: 18, count: 6 },
            { id: "privacy-what-isnt-collected", start: 24, count: 6 },
            { id: "privacy-what-is-shared", start: 30, count: 6 },
            { id: "privacy-updates", start: 36, count: 2 },
            { id: "privacy-hat-tips", start: 38, count: 2 },
            { id: "privacy-feedback", start: 40, count: 2 },
            { id: "privacy-update-history", start: 42, count: 6 },
        ],
    },
};

/** Mulberry32 seeded RNG */
function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0;
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function getSeed(): number {
    const ts = Date.now();
    const buf = new Uint8Array(4);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(buf);
    }
    const r = (buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!;
    return (ts >>> 0) ^ r;
}

function getEnergyForColor(color: OrbColor, rng: () => number): number {
    const ratio = color === "rainbow" ? 0.5 : COLOR_RATIOS[color];
    const base = ratio * 1.2;
    const jitter = (rng() - 0.5) * 0.25;
    return Math.max(0.05, Math.min(0.98, base + jitter));
}

const roomCache: Record<
    string,
    Array<{ color: OrbColor; image: string; energy: number }>
> = {};

/** Per-route used images – each route gets its own pool so /download has images when / exhausted them. */
const allUsedImagesByRoute: Record<string, Set<string>> = {};

function getUsedSetForRoute(roomPath: string): Set<string> {
    if (!allUsedImagesByRoute[roomPath])
        allUsedImagesByRoute[roomPath] = new Set();
    return allUsedImagesByRoute[roomPath]!;
}

export function isImageUsed(path: string, roomPath: string): boolean {
    return getUsedSetForRoute(roomPath).has(path);
}
export function markImagesUsed(paths: string[], roomPath: string): void {
    const set = getUsedSetForRoute(roomPath);
    paths.forEach((p) => set.add(p));
}

/** Pick any unused image from all pools (for rainbow fallback) */
function pickAnyUnusedImage(
    roomPath: string,
    usedThisRoom: Set<string>,
    rng: () => number
): string {
    const routeUsed = getUsedSetForRoute(roomPath);
    const all: string[] = [];
    for (const images of Object.values(ORB_IMAGES_BY_COLOR)) {
        for (const p of images ?? []) {
            if (!routeUsed.has(p) && !usedThisRoom.has(p)) all.push(p);
        }
    }
    if (all.length === 0) return "";
    const pick = all[Math.floor(rng() * all.length)]!;
    usedThisRoom.add(pick);
    routeUsed.add(pick);
    return pick;
}

/** Pick image for a color. ONLY from that color's folder. Per-route pool. */
function pickImageForColor(
    roomPath: string,
    color: OrbColor,
    usedThisRoom: Set<string>,
    rng: () => number
): string {
    const routeUsed = getUsedSetForRoute(roomPath);
    const pool = ORB_IMAGES_BY_COLOR[color] ?? [];
    const prefer = pool.filter(
        (path) => !routeUsed.has(path) && !usedThisRoom.has(path)
    );
    if (prefer.length > 0) {
        const pick = prefer[Math.floor(rng() * prefer.length)]!;
        usedThisRoom.add(pick);
        routeUsed.add(pick);
        return pick;
    }
    if (color === "rainbow") {
        return pickAnyUnusedImage(roomPath, usedThisRoom, rng);
    }
    return "";
}

function generateRoomOrbs(
    roomPath: string,
    rng: () => number
): Array<{ color: OrbColor; image: string; energy: number }> {
    const cfg = ROOM_CONFIG[roomPath];
    if (!cfg) return [];

    const total = cfg.total;
    const usedThisRoom = new Set<string>();

    const rainbowSlot = Math.floor(rng() * total);
    const colorSlots: OrbColor[] = [];
    const remaining = total - 1;
    for (const [color, ratio] of COLOR_CHANCES) {
        const n = Math.round(remaining * ratio);
        for (let i = 0; i < n && colorSlots.length < remaining; i++) {
            colorSlots.push(color as OrbColor);
        }
    }
    while (colorSlots.length < remaining) colorSlots.push("red" as OrbColor);
    while (colorSlots.length > remaining) colorSlots.pop();
    colorSlots.splice(rainbowSlot, 0, "rainbow");

    for (let i = colorSlots.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [colorSlots[i], colorSlots[j]] = [colorSlots[j]!, colorSlots[i]!];
    }

    const result: Array<{
        color: OrbColor;
        image: string;
        energy: number;
    }> = [];

    for (let i = 0; i < total; i++) {
        const color = colorSlots[i]!;
        const energy = getEnergyForColor(color, rng);
        const image = pickImageForColor(roomPath, color, usedThisRoom, rng);
        result.push({ color, image, energy });
    }

    return result;
}

export const ENERGY_ROTATE_THRESHOLD = 0.35;

/** Clear orb cache. Base change: invalidate(path). Respawn: invalidate() clears all + resets used images. */
export function invalidateRoomCache(roomPath?: string): void {
    if (roomPath != null) {
        delete roomCache[roomPath];
        delete allUsedImagesByRoute[roomPath];
    } else {
        for (const k of Object.keys(roomCache)) delete roomCache[k];
        for (const k of Object.keys(allUsedImagesByRoute))
            delete allUsedImagesByRoute[k];
    }
}

/** Get orbs for a slot. Lazily generates when cache is empty (new room). */
export function generateOrbs(
    count: number,
    slotId: string,
    roomPath: string
): Array<{ color: OrbColor; image: string; energy: number }> {
    const cfg = ROOM_CONFIG[roomPath];
    if (!cfg) return [];

    if (!roomCache[roomPath]) {
        const seed = getSeed();
        const rng = mulberry32(seed);
        roomCache[roomPath] = generateRoomOrbs(roomPath, rng);
    }

    const pool = roomCache[roomPath]!;

    let slot = cfg.slots.find((s) => s.id === slotId);
    if (!slot && slotId.includes("-")) {
        const baseId = slotId.replace(/-\d+$/, "");
        slot = cfg.slots.find((s) => s.id === baseId);
    }
    if (!slot) return pool.slice(0, count);

    const take = Math.min(count, slot.count);
    return pool.slice(slot.start, slot.start + take);
}

export function getDriftDuration(energy: number): number {
    return 18 + (1 - energy) * 22;
}

export function getRotateDuration(energy: number): number | null {
    if (energy < ENERGY_ROTATE_THRESHOLD) return null;
    return 25 + (1 - energy) * 20;
}
