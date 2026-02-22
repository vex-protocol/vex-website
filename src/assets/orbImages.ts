/**
 * Procedural orb generation per room. Seed = unix timestamp + 4 crypto bytes.
 * No image duplicates from the previous room; pad with empty orbs if needed.
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

let lastRoomId: string | null = null;
let lastRoomImages: Set<string> = new Set();
const roomCache: Record<
    string,
    Array<{ color: OrbColor; image: string; energy: number }>
> = {};

/** Pick image for a color – only from that color's folder, exclude last room. Empty if none. */
function pickImageForColor(
    color: OrbColor,
    lastRoomImages: Set<string>,
    usedThisRoom: Set<string>,
    rng: () => number
): string {
    const images = ORB_IMAGES_BY_COLOR[color] ?? [];
    const available = images.filter(
        (path) => !lastRoomImages.has(path) && !usedThisRoom.has(path)
    );
    if (available.length === 0) return "";
    const pick = available[Math.floor(rng() * available.length)]!;
    usedThisRoom.add(pick);
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

    const result: Array<{
        color: OrbColor;
        image: string;
        energy: number;
    }> = [];

    for (let i = 0; i < total; i++) {
        const color = colorSlots[i]!;
        const energy = getEnergyForColor(color, rng);
        const image = pickImageForColor(
            color,
            lastRoomImages,
            usedThisRoom,
            rng
        );
        result.push({ color, image, energy });
    }

    lastRoomImages = new Set(usedThisRoom);
    if (lastRoomId) delete roomCache[lastRoomId];
    lastRoomId = roomPath;
    return result;
}

export const ENERGY_ROTATE_THRESHOLD = 0.35;

/** Clear orb cache so next generateOrbs uses a new random seed. Call before respawn. */
export function invalidateRoomCache(roomPath?: string): void {
    if (roomPath != null) {
        delete roomCache[roomPath];
        if (lastRoomId === roomPath) lastRoomId = null;
    } else {
        for (const k of Object.keys(roomCache)) delete roomCache[k];
        lastRoomId = null;
        lastRoomImages.clear();
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
