/**
 * Procedural image selection per playthrough. Shares "used once" with orb images.
 * Card icons use full orb pool (all colors); heading color matches the image's color folder.
 */

import type { OrbColor } from "./orbImages";
import { isImageUsed, markImagesUsed, ORB_IMAGES_BY_COLOR } from "./orbImages";
import haloRed from "./halo-red.jpeg";
import blackHole from "./ROYALPURPLE/BLACKHOLE.jpg";

const HALO_IMAGES = [haloRed, blackHole];

/** Build flat list of { image, color } from all orb images */
const IMAGES_WITH_COLORS: Array<{ image: string; color: OrbColor }> = (() => {
    const result: Array<{ image: string; color: OrbColor }> = [];
    for (const [color, images] of Object.entries(ORB_IMAGES_BY_COLOR)) {
        for (const img of images ?? []) {
            result.push({ image: img, color: color as OrbColor });
        }
    }
    return result;
})();

/** Hex colors for headings, keyed by orb color folder */
const COLOR_HEX: Record<OrbColor, string> = {
    red: "#e70000",
    purple: "#7c3aed",
    green: "#91e643",
    blue: "#a8c8df",
    pink: "#c5698b",
    cream: "#d9c2a3",
    rainbow: "#e70000",
};

export type CardWithColor = {
    image: string;
    color: string;
    colorBg: string;
};

/** Darken a hex color for button backgrounds */
function darkenHex(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * amount);
    const g = Math.round(((n >> 8) & 255) * amount);
    const b = Math.round((n & 255) * amount);
    return (
        "#" +
        [r, g, b]
            .map((x) => Math.max(0, x).toString(16).padStart(2, "0"))
            .join("")
    );
}

const cache: Record<
    string,
    {
        mascot: string;
        halo: string;
        card: CardWithColor;
        card2: CardWithColor;
        cardHero: CardWithColor;
        cardContact: CardWithColor;
    }
> = {};
let seedCache: Record<string, number> = {};

function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0;
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function getSeed(runKey: number): number {
    const ts = Date.now();
    const buf = new Uint8Array(4);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(buf);
    }
    const r = (buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!;
    return ((ts >>> 0) ^ r) + runKey * 0x9e3779b9;
}

/** Pick distinct indices from pool, no duplicates. */
function pickDistinctIndices(
    poolSize: number,
    count: number,
    rng: () => number
): number[] {
    const indices: number[] = [];
    const available = Array.from({ length: poolSize }, (_, i) => i);
    for (let i = 0; i < count && available.length > 0; i++) {
        const idx = Math.floor(rng() * available.length);
        indices.push(available[idx]!);
        available.splice(idx, 1);
    }
    return indices;
}

/** Pick distinct items from pool (image+color), avoiding used images. */
function pickCardIcons(
    pool: Array<{ image: string; color: OrbColor }>,
    count: number,
    rng: () => number
): CardWithColor[] {
    const available = pool.filter(({ image }) => !isImageUsed(image));
    const indices = pickDistinctIndices(
        available.length,
        Math.min(count, available.length),
        rng
    );
    const picked = indices.map((i) => available[i]!);
    const images = picked.map((p) => p.image);
    markImagesUsed(images);
    return picked.map(({ image, color }) => {
        const hex = COLOR_HEX[color] ?? COLOR_HEX.red;
        return {
            image,
            color: hex,
            colorBg: darkenHex(hex, 0.45),
        };
    });
}

/** Get procedural mascot for hero orb. Same for whole run. */
export function getProceduralMascot(runKey: number): string {
    if (cache[String(runKey)]) return cache[String(runKey)].mascot;
    const key = String(runKey);
    seedCache[key] ??= getSeed(runKey);
    const rng = mulberry32(seedCache[key]!);
    const halosAvailable = HALO_IMAGES.filter((p) => !isImageUsed(p));
    const halo =
        halosAvailable.length > 0
            ? halosAvailable[Math.floor(rng() * halosAvailable.length)]!
            : HALO_IMAGES[0]!;
    markImagesUsed([halo]);

    const cards = pickCardIcons(IMAGES_WITH_COLORS, 5, rng);
    const mascot = cards[0]?.image ?? IMAGES_WITH_COLORS[0]?.image ?? "";
    const fallback = {
        image: mascot,
        color: COLOR_HEX.red,
        colorBg: darkenHex(COLOR_HEX.red, 0.45),
    };
    const card = cards[1] ?? cards[0] ?? fallback;
    const card2 = cards[2] ?? card;
    const cardHero = cards[3] ?? card;
    const cardContact = cards[4] ?? card2;

    cache[String(runKey)] = {
        mascot,
        halo,
        card,
        card2,
        cardHero,
        cardContact,
    };
    return mascot;
}

/** Get procedural halo/background. Same for whole run. */
export function getProceduralHalo(runKey: number): string {
    if (cache[String(runKey)]) return cache[String(runKey)].halo;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].halo;
}

/** Get procedural card for about section. Same for whole run. */
export function getProceduralCard(runKey: number): CardWithColor {
    if (cache[String(runKey)]) return cache[String(runKey)].card;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].card;
}

/** Get procedural card for features section. Same for whole run. */
export function getProceduralCard2(runKey: number): CardWithColor {
    if (cache[String(runKey)]) return cache[String(runKey)].card2;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].card2;
}

/** Get procedural card for hero card icon. Same for whole run. */
export function getProceduralCardHero(runKey: number): CardWithColor {
    if (cache[String(runKey)]) return cache[String(runKey)].cardHero;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].cardHero;
}

/** Get procedural card for contact card icon. Same for whole run. */
export function getProceduralCardContact(runKey: number): CardWithColor {
    if (cache[String(runKey)]) return cache[String(runKey)].cardContact;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].cardContact;
}
