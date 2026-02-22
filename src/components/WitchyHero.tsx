import React, { useMemo } from "react";
import "../stylesheets/style.sass";
import { generateOrbs, OrbColor } from "../assets/orbImages";
import { useIsMobile } from "../hooks/useIsMobile";
import { useRespawn } from "../context/RespawnContext";
import { useProceduralImages } from "../hooks/useProceduralImages";

const STAR_COUNT = 24;
const STAR_COUNT_MOBILE = 10;
const ORB_COUNT = 4;
const ORB_COUNT_MOBILE = 2;

const ORB_POSITIONS: [string, string][] = [
    ["15%", "20%"],
    ["60%", "60%"],
    ["30%", "70%"],
    ["70%", "25%"],
];

// Fewer orbs, spread across empty spaces
const ORB_POSITIONS_MOBILE: [string, string][] = [
    ["18%", "22%"],
    ["72%", "68%"],
];

const ORB_SIZES = [
    "witchy-orb--lg",
    "witchy-orb--md",
    "witchy-orb--sm",
    "witchy-orb--sm",
];
const ORB_SIZES_MOBILE = ["witchy-orb--md", "witchy-orb--md"];

const COLOR_TO_MODIFIER: Record<OrbColor, string> = {
    red: "",
    purple: "witchy-orb--purple",
    green: "witchy-orb--green",
    blue: "witchy-orb--blue",
    pink: "witchy-orb--pink",
    cream: "witchy-orb--cream",
    rainbow: "witchy-orb--rainbow",
};

export function WitchyHero({
    roomPath = "/",
}: {
    roomPath?: string;
}): JSX.Element {
    const isMobile = useIsMobile();
    const orbCount = isMobile ? ORB_COUNT_MOBILE : ORB_COUNT;
    const positions = isMobile ? ORB_POSITIONS_MOBILE : ORB_POSITIONS;
    const sizes = isMobile ? ORB_SIZES_MOBILE : ORB_SIZES;
    const starCount = isMobile ? STAR_COUNT_MOBILE : STAR_COUNT;

    const { respawnTrigger } = useRespawn();
    const { mascot } = useProceduralImages();
    const orbs = useMemo(
        () => generateOrbs(orbCount, "home-hero", roomPath),
        // respawnTrigger intentionally triggers regeneration when it changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [orbCount, roomPath, respawnTrigger]
    );

    const stars = Array.from({ length: starCount }, (_, i) => ({
        id: i,
        left: `${(i * 7 + 3) % 100}%`,
        top: `${(i * 11 + 5) % 100}%`,
        delay: `${(i % 6) * 0.6}s`,
        duration: `${7 + (i % 4)}s`,
    }));

    return (
        <div className="witchy-container">
            <div className="witchy-mist" aria-hidden />
            {orbs.map((orb, i) => {
                const [left, top] = positions[i];
                const modifier = COLOR_TO_MODIFIER[orb.color];
                return (
                    <div
                        key={`${orb.color}-${i}-${orb.image || "empty"}`}
                        className={`witchy-orb ${
                            orb.image ? "witchy-orb--with-image" : ""
                        } ${sizes[i]} ${modifier}`}
                        style={{ top, left }}
                        aria-hidden
                    >
                        {orb.image ? (
                            <div className="witchy-orb__inner">
                                <img
                                    src={orb.image}
                                    alt=""
                                    className="witchy-orb__img"
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
            <div
                className="mascot-witchy-orb mascot-witchy-orb--float"
                style={{ top: "32%", left: "6%" }}
                aria-hidden
            >
                <div className="mascot-witchy-orb__orb" aria-hidden />
                <div className="mascot-witchy-orb__inner">
                    <img
                        src={mascot}
                        alt=""
                        className="hero-mascot"
                        loading="eager"
                        decoding="async"
                    />
                </div>
                <div className="mascot-witchy-orb__particles" aria-hidden>
                    <span className="mascot-witchy-orb__particle" />
                    <span className="mascot-witchy-orb__particle" />
                    <span className="mascot-witchy-orb__particle" />
                </div>
            </div>
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
        </div>
    );
}
