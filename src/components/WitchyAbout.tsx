import React from "react";
import girlRed from "../assets/girl-red.jpg";

export function WitchyAbout(): JSX.Element {
    return (
        <div className="witchy-container witchy-container--about">
            <div className="card-mascot card-mascot--privacy" aria-hidden>
                <div className="card-mascot__glow" aria-hidden />
                <div className="card-mascot__frame">
                    <img src={girlRed} alt="" className="card-mascot__img" />
                </div>
                <div className="card-mascot__particles" aria-hidden>
                    <span className="card-mascot__particle" />
                    <span className="card-mascot__particle" />
                    <span className="card-mascot__particle" />
                    <span className="card-mascot__particle" />
                    <span className="card-mascot__particle" />
                </div>
            </div>
        </div>
    );
}
