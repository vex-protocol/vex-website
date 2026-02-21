// Combining characters for zalgo effect (above + below)
const ABOVE = [
    "\u0300",
    "\u0301",
    "\u0302",
    "\u0303",
    "\u0304",
    "\u0305",
    "\u0306",
    "\u0307",
    "\u0308",
    "\u0309",
    "\u030a",
    "\u030b",
    "\u030c",
    "\u0312",
    "\u0313",
    "\u0314",
    "\u0315",
    "\u031a",
    "\u033d",
    "\u033e",
    "\u033f",
];
const BELOW = [
    "\u0325",
    "\u0326",
    "\u0327",
    "\u0328",
    "\u0329",
    "\u032a",
    "\u032b",
    "\u032c",
    "\u032d",
    "\u032e",
    "\u032f",
    "\u0330",
    "\u0331",
    "\u0332",
    "\u0333",
    "\u0339",
    "\u033a",
    "\u033b",
    "\u033c",
];

function pick<T>(arr: T[], count: number): T[] {
    const out: T[] = [];
    for (let i = 0; i < count; i++) {
        out.push(arr[Math.floor(Math.random() * arr.length)]);
    }
    return out;
}

/**
 * Returns text with zalgo (combining characters) applied. Use intensity 0–1.
 * Same input always gives same output (seeded by string).
 */
export function zalgo(text: string, intensity: number = 0.4): string {
    let seed = 0;
    for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);
    const rng = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    let out = "";
    for (const char of text) {
        if (char === " " || char === "." || char === ",") {
            out += char;
            continue;
        }
        const nAbove = rng() < intensity ? 1 + Math.floor(rng() * 2) : 0;
        const nBelow = rng() < intensity ? 1 + Math.floor(rng() * 2) : 0;
        out +=
            char + pick(ABOVE, nAbove).join("") + pick(BELOW, nBelow).join("");
    }
    return out;
}
