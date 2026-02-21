import React from "react";
import "../stylesheets/style.sass";

export function WitchyFeatures(): JSX.Element {
    return (
        <div className="witchy-container">
            <div
                className="witchy-rune"
                style={{
                    top: "50%",
                    left: "50%",
                    marginTop: "-90px",
                    marginLeft: "-90px",
                }}
                aria-hidden
            />
            <div
                className="witchy-orb witchy-orb--sm"
                style={{ top: "20%", left: "30%" }}
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
                style={{ top: "75%", left: "70%" }}
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
