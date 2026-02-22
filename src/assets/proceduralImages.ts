/**
 * Procedural image selection per playthrough. Each respawn generates a new run;
 * mascot, halo, and card images are picked from pools.
 */

import girlRed from "./girl-red.jpg";
import haloRed from "./halo-red.jpeg";
import basedmilio from "./FIRERED/basedmilio4.jpeg";
import redGirl from "./FIRERED/REDGIRL.jpeg";
import plane from "./FIRERED/plane.jpg";
import blackHole from "./ROYALPURPLE/BLACKHOLE.jpg";

const MASCOT_IMAGES = [girlRed, basedmilio, redGirl, plane];
const HALO_IMAGES = [haloRed, blackHole];
const CARD_IMAGES = [girlRed, basedmilio, redGirl, plane];

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

/** Get procedural mascot for hero. Same for whole run (runKey = respawnTrigger). */
export function getProceduralMascot(runKey: number): string {
    if (cache[String(runKey)]) return cache[String(runKey)].mascot;
    const key = String(runKey);
    seedCache[key] ??= getSeed(runKey);
    const rng = mulberry32(seedCache[key]!);
    const idx = Math.floor(rng() * MASCOT_IMAGES.length);
    const mascot = MASCOT_IMAGES[idx]!;
    const halo = HALO_IMAGES[Math.floor(rng() * HALO_IMAGES.length)]!;
    const cardIdx = Math.floor(rng() * CARD_IMAGES.length);
    let card2Idx = Math.floor(rng() * CARD_IMAGES.length);
    while (card2Idx === cardIdx && CARD_IMAGES.length > 1)
        card2Idx = Math.floor(rng() * CARD_IMAGES.length);
    const card = CARD_IMAGES[cardIdx]!;
    const card2 = CARD_IMAGES[card2Idx]!;
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
