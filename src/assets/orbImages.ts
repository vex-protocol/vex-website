/**
 * Procedural orb generation. Prefer each image at most once per playthrough (until respawn).
 * When pool exhausted (e.g. / uses 22, /privacy-policy needs 48), allow reuse to avoid empty orbs.
 * Base change = invalidate route cache; respawn = clear all + reset used images.
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

function loadAllImagesByColor(): Record<OrbColor, string[]> {
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

const ALL_ORB_IMAGES = (() => {
    const seen = new Set<string>();
    for (const arr of Object.values(ORB_IMAGES_BY_COLOR)) {
        for (const p of arr) seen.add(p);
    }
    return Array.from(seen);
})();

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
            { id: "privacy-updates-and-more", start: 36, count: 6 },
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

/** Every image ever used this session – never reuse. Shared with procedural images. */
const allUsedImages = new Set<string>();

export function isImageUsed(path: string): boolean {
    return allUsedImages.has(path);
}
export function markImagesUsed(paths: string[]): void {
    paths.forEach((p) => allUsedImages.add(p));
}

/** Pick image for a color. Prefer unused; when global pool exhausted, allow reuse (avoid same-room repeats). Empty only if no images exist. */
function pickImageForColor(
    color: OrbColor,
    usedThisRoom: Set<string>,
    rng: () => number
): string {
    // 1. Color-specific, unused globally
    const prefer = (ORB_IMAGES_BY_COLOR[color] ?? []).filter(
        (path) => !allUsedImages.has(path) && !usedThisRoom.has(path)
    );
    if (prefer.length > 0) {
        const pick = prefer[Math.floor(rng() * prefer.length)]!;
        usedThisRoom.add(pick);
        allUsedImages.add(pick);
        return pick;
    }
    // 2. Any image, unused globally
    const fallback = ALL_ORB_IMAGES.filter(
        (path) => !allUsedImages.has(path) && !usedThisRoom.has(path)
    );
    if (fallback.length > 0) {
        const pick = fallback[Math.floor(rng() * fallback.length)]!;
        usedThisRoom.add(pick);
        allUsedImages.add(pick);
        return pick;
    }
    // 3. Pool exhausted (e.g. / used 22, /privacy-policy needs 48): allow reuse, but avoid same-room repeats
    const allowReuse = ALL_ORB_IMAGES.filter((path) => !usedThisRoom.has(path));
    if (allowReuse.length > 0) {
        const pick = allowReuse[Math.floor(rng() * allowReuse.length)]!;
        usedThisRoom.add(pick);
        return pick;
    }
    // 4. Room has more orbs than total images: allow same-room reuse
    if (ALL_ORB_IMAGES.length === 0) return "";
    const pick =
        ALL_ORB_IMAGES[Math.floor(rng() * ALL_ORB_IMAGES.length)] ?? "";
    return pick;
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
        const image = pickImageForColor(color, usedThisRoom, rng);
        result.push({ color, image, energy });
    }

    return result;
}

export const ENERGY_ROTATE_THRESHOLD = 0.35;

/** Clear orb cache. Base change: invalidate(path). Respawn: invalidate() clears all + resets used images. */
export function invalidateRoomCache(roomPath?: string): void {
    if (roomPath != null) {
        delete roomCache[roomPath];
    } else {
        for (const k of Object.keys(roomCache)) delete roomCache[k];
        allUsedImages.clear();
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
