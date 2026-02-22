import React, { useRef, useMemo } from "react";
import { generateOrbs, OrbColor } from "../assets/orbImages";
import { useIsMobile } from "../hooks/useIsMobile";
import { useRespawn } from "../context/RespawnContext";

let networkId = 0;

const STAR_COUNT = 20;
const STAR_COUNT_MOBILE = 8;
const ORB_COUNT = 6;
const ORB_COUNT_MOBILE = 3;

type WitchyOrbsSection = "about" | "features";

// Orb positions and sizes per section – about and features are unique
const ORB_LAYOUTS: Record<
    WitchyOrbsSection,
    {
        positions: [string, string][];
        sizes: string[];
        coords: [number, number][];
        positionsMobile: [string, string][];
        sizesMobile: string[];
        coordsMobile: [number, number][];
    }
> = {
    about: {
        positions: [
            ["8%", "18%"],
            ["72%", "48%"],
            ["28%", "78%"],
            ["68%", "22%"],
            ["85%", "62%"],
            ["12%", "58%"],
        ],
        sizes: [
            "witchy-orb--lg",
            "witchy-orb--md",
            "witchy-orb--sm",
            "witchy-orb--md",
            "witchy-orb--sm",
            "witchy-orb--md",
        ],
        coords: [
            [8, 18],
            [72, 48],
            [28, 78],
            [68, 22],
            [85, 62],
            [12, 58],
        ],
        positionsMobile: [
            ["18%", "28%"],
            ["78%", "52%"],
            ["45%", "85%"],
        ],
        sizesMobile: ["witchy-orb--md", "witchy-orb--lg", "witchy-orb--sm"],
        coordsMobile: [
            [18, 28],
            [78, 52],
            [45, 85],
        ],
    },
    features: {
        positions: [
            ["15%", "22%"],
            ["75%", "55%"],
            ["35%", "72%"],
            ["60%", "18%"],
            ["82%", "38%"],
            ["5%", "68%"],
        ],
        sizes: [
            "witchy-orb--md",
            "witchy-orb--sm",
            "witchy-orb--lg",
            "witchy-orb--sm",
            "witchy-orb--md",
            "witchy-orb--sm",
        ],
        coords: [
            [15, 22],
            [75, 55],
            [35, 72],
            [60, 18],
            [82, 38],
            [5, 68],
        ],
        positionsMobile: [
            ["22%", "32%"],
            ["72%", "58%"],
            ["38%", "88%"],
        ],
        sizesMobile: ["witchy-orb--sm", "witchy-orb--md", "witchy-orb--md"],
        coordsMobile: [
            [22, 32],
            [72, 58],
            [38, 88],
        ],
    },
};

// Cycle: each orb emits to next, craft destroyed at dest, dest emits to its next (staggered delays)
const SPACECRAFT_ROUTES: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0],
];
// Mobile: cycle between 3 orbs
const SPACECRAFT_ROUTES_MOBILE: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 0],
];
const SPACECRAFT_DURATION = 6;

const COLOR_TO_MODIFIER: Record<OrbColor, string> = {
    red: "",
    purple: "witchy-orb--purple",
    green: "witchy-orb--green",
    blue: "witchy-orb--blue",
    pink: "witchy-orb--pink",
    cream: "witchy-orb--cream",
    rainbow: "witchy-orb--rainbow",
};

const COLOR_HEX: Record<OrbColor, string> = {
    red: "#e70000",
    purple: "#2a075b",
    green: "#91e643",
    blue: "#a8c8df",
    pink: "#c5698b",
    cream: "#d9c2a3",
    rainbow: "#c5698b", // fallback for spacecraft/explosion (pink from gradient)
};

const EXPLOSION_PARTICLE_COUNT = 8;

/** Orbs = planets with images, stars drift, spacecraft lights move between them */
export function WitchyOrbs({
    roomPath,
    slotId,
    section,
}: {
    roomPath: string;
    slotId: string;
    section: WitchyOrbsSection;
}): JSX.Element {
    const isMobile = useIsMobile();
    const filterId = useRef(`witchy-spacecraft-glow-${++networkId}`).current;
    const layout = ORB_LAYOUTS[section];
    const orbCount = isMobile ? ORB_COUNT_MOBILE : ORB_COUNT;
    const positions = isMobile ? layout.positionsMobile : layout.positions;
    const sizes = isMobile ? layout.sizesMobile : layout.sizes;
    const orbCoords = isMobile ? layout.coordsMobile : layout.coords;
    const spacecraftRoutes = isMobile
        ? SPACECRAFT_ROUTES_MOBILE
        : SPACECRAFT_ROUTES;
    const starCount = isMobile ? STAR_COUNT_MOBILE : STAR_COUNT;

    const { respawnTrigger } = useRespawn();
    const orbs = useMemo(() => generateOrbs(orbCount, slotId, roomPath), [
        orbCount,
        slotId,
        roomPath,
        respawnTrigger,
    ]);

    const stars = Array.from({ length: starCount }, (_, i) => ({
        id: i,
        left: `${(i * 13 + 7) % 100}%`,
        top: `${(i * 17 + 11) % 100}%`,
        delay: `${(i % 6) * 0.5}s`,
        duration: `${6 + (i % 4)}s`,
    }));

    return (
        <div className="witchy-container witchy-container--orbs">
            {stars.map((s) => (
                <div
                    key={s.id}
                    className="witchy-star"
                    style={{
                        left: s.left,
                        top: s.top,
                        animationDelay: s.delay,
                        animationDuration: s.duration,
                    }}
                    aria-hidden
                />
            ))}
            <svg
                className="witchy-network"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
            >
                <defs>
                    <filter
                        id={filterId}
                        x="-100%"
                        y="-100%"
                        width="300%"
                        height="300%"
                    >
                        <feGaussianBlur stdDeviation="0.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {spacecraftRoutes.map(([a, b], idx) => {
                    const [x1, y1] = orbCoords[a];
                    const [x2, y2] = orbCoords[b];
                    const pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
                    const originColor = orbs[a]?.color ?? "red";
                    const destColor = orbs[b]?.color ?? "red";
                    // Stagger: each craft departs when prev arrives, so dest "emits" on receive
                    const begin = idx * SPACECRAFT_DURATION;
                    return (
                        <g key={`${a}-${b}`}>
                            <circle
                                className="witchy-spacecraft"
                                r="0.9"
                                fill={COLOR_HEX[originColor]}
                                filter={`url(#${filterId})`}
                                style={{
                                    animationDelay: `${begin}s`,
                                }}
                            >
                                <animateMotion
                                    dur={`${SPACECRAFT_DURATION}s`}
                                    repeatCount="indefinite"
                                    path={pathD}
                                    begin={`${begin}s`}
                                />
                            </circle>
                            {/* Particle explosion at destination – craft destroyed, particles = new (dest) color */}
                            <g
                                transform={`translate(${x2}, ${y2})`}
                                className="witchy-spacecraft-explosion"
                                style={{
                                    animationDelay: `${
                                        begin + SPACECRAFT_DURATION - 0.25
                                    }s`,
                                    animationDuration: `${SPACECRAFT_DURATION}s`,
                                }}
                            >
                                {Array.from(
                                    { length: EXPLOSION_PARTICLE_COUNT },
                                    (_, i) => (
                                        <g
                                            key={i}
                                            transform={`rotate(${
                                                (i * 360) /
                                                EXPLOSION_PARTICLE_COUNT
                                            })`}
                                        >
                                            <circle
                                                className="witchy-spacecraft-explosion__particle"
                                                r="0.4"
                                                fill={COLOR_HEX[destColor]}
                                            />
                                        </g>
                                    )
                                )}
                            </g>
                        </g>
                    );
                })}
            </svg>
            <div className="witchy-mist" aria-hidden />
            {orbs.map((orb, i) => {
                const [left, top] = positions[i];
                const modifier = COLOR_TO_MODIFIER[orb.color];
                const sizeClass = sizes[i] ?? "witchy-orb--sm";
                return (
                    <div
                        key={`${orb.color}-${i}-${orb.image || "empty"}`}
                        className={`witchy-orb ${
                            orb.image ? "witchy-orb--with-image" : ""
                        } ${sizeClass} ${modifier}`}
                        style={{ top, left }}
                        aria-hidden
                    >
                        {orb.image ? (
                            <div className="witchy-orb__inner">
                                <img
                                    src={orb.image}
                                    alt=""
                                    className="witchy-orb__img"
                                    loading="eager"
                                    decoding="async"
                                    onError={(e) => {
                                        const img = e.currentTarget;
                                        if (!img.dataset.retried) {
                                            img.dataset.retried = "1";
                                            img.src = orb.image;
                                        }
                                    }}
                                />
                            </div>
                        ) : null}
                        <div className="witchy-orb__particles" aria-hidden>
                            <span className="witchy-orb__particle" />
                            <span className="witchy-orb__particle" />
                            <span className="witchy-orb__particle" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
