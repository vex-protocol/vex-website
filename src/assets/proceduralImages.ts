/**
 * Procedural image selection per playthrough. Shares "used once" with orb images.
 */

import { isImageUsed, markImagesUsed } from "./orbImages";
import girlRed from "./girl-red.jpg";
import haloRed from "./halo-red.jpeg";
import basedmilio from "./FIRERED/basedmilio4.jpeg";
import redGirl from "./FIRERED/REDGIRL.jpeg";
import plane from "./FIRERED/plane.jpg";
import blackHole from "./ROYALPURPLE/BLACKHOLE.jpg";

const MASCOT_IMAGES = [girlRed, basedmilio, redGirl, plane];
const HALO_IMAGES = [haloRed, blackHole];

const cache: Record<
    string,
    { mascot: string; halo: string; card: string; card2: string }
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

/** Get procedural mascot for hero. Same for whole run. Never reuses images used by orbs or prior picks. */
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
    const mascotsAvailable = MASCOT_IMAGES.filter((p) => !isImageUsed(p));
    const avatarIndices = pickDistinctIndices(
        mascotsAvailable.length,
        Math.min(3, mascotsAvailable.length),
        rng
    );
    const mascot = mascotsAvailable[avatarIndices[0] ?? 0] ?? MASCOT_IMAGES[0]!;
    const card = mascotsAvailable[avatarIndices[1] ?? 0] ?? mascot;
    const card2 = mascotsAvailable[avatarIndices[2] ?? 0] ?? card;
    markImagesUsed([halo, mascot, card, card2].filter(Boolean));
    cache[String(runKey)] = { mascot, halo, card, card2 };
    return mascot;
}

/** Get procedural halo/background. Same for whole run. */
export function getProceduralHalo(runKey: number): string {
    if (cache[String(runKey)]) return cache[String(runKey)].halo;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].halo;
}

/** Get procedural card image for about section. Same for whole run. */
export function getProceduralCard(runKey: number): string {
    if (cache[String(runKey)]) return cache[String(runKey)].card;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].card;
}

/** Get procedural card image for features section. Same for whole run. */
export function getProceduralCard2(runKey: number): string {
    if (cache[String(runKey)]) return cache[String(runKey)].card2;
    getProceduralMascot(runKey); // populate cache
    return cache[String(runKey)].card2;
}
