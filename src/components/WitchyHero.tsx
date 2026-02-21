import React from "react";
import "../stylesheets/style.sass";
import girlRed from "../assets/girl-red.jpg";

const STAR_COUNT = 24;

export function WitchyHero(): JSX.Element {
    const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 7 + 3) % 100}%`,
        top: `${(i * 11 + 5) % 100}%`,
        delay: `${(i % 5) * 0.4}s`,
        duration: `${2.5 + (i % 3)}s`,
    }));

    return (
        <div className="witchy-container">
            <div className="witchy-mist" aria-hidden />
            <div
                className="witchy-orb witchy-orb--lg"
                style={{ top: "15%", left: "20%" }}
                aria-hidden
            >
                <div className="witchy-orb__particles" aria-hidden>
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                </div>
            </div>
            <div
                className="witchy-orb witchy-orb--md"
                style={{ top: "60%", left: "60%" }}
                aria-hidden
            >
                <div className="witchy-orb__particles" aria-hidden>
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                </div>
            </div>
            <div
                className="witchy-orb witchy-orb--sm"
                style={{ top: "30%", left: "70%" }}
                aria-hidden
            >
                <div className="witchy-orb__particles" aria-hidden>
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                </div>
            </div>
            <div
                className="witchy-orb witchy-orb--sm"
                style={{ top: "70%", left: "25%" }}
                aria-hidden
            >
                <div className="witchy-orb__particles" aria-hidden>
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                </div>
            </div>
            <div
                className="mascot-witchy-orb mascot-witchy-orb--float"
                style={{ top: "32%", left: "6%" }}
                aria-hidden
            >
                <div className="mascot-witchy-orb__orb" aria-hidden />
                <div className="mascot-witchy-orb__inner">
                    <img src={girlRed} alt="" className="hero-mascot" />
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
