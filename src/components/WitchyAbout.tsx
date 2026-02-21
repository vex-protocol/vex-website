import React from "react";
import "../stylesheets/style.sass";

export function WitchyAbout(): JSX.Element {
    return (
        <div className="witchy-container witchy-container--about">
            <div
                className="witchy-orb witchy-orb--lg"
                style={{ top: "10%", left: "15%" }}
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
                style={{ top: "55%", left: "55%" }}
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
                style={{ top: "75%", left: "20%" }}
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
                style={{ top: "25%", left: "65%" }}
                aria-hidden
            >
                <div className="witchy-orb__particles" aria-hidden>
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                    <span className="witchy-orb__particle" />
                </div>
            </div>
        </div>
    );
}
