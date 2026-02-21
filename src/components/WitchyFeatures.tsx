import React from "react";
import vexNu from "../assets/vex-nu.png";

export function WitchyFeatures(): JSX.Element {
    return (
        <div className="witchy-container witchy-container--features">
            <div className="card-mascot card-mascot--logo" aria-hidden>
                <div className="card-mascot__glow" aria-hidden />
                <div className="card-mascot__frame">
                    <img src={vexNu} alt="" className="card-mascot__img" />
                </div>
                <div className="card-mascot__particles" aria-hidden>
                    <span className="card-mascot__particle" />
                    <span className="card-mascot__particle" />
                    <span className="card-mascot__particle" />
                </div>
            </div>
        </div>
    );
}
