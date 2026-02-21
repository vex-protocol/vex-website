import React from "react";
import { ReleaseLinks } from "../components/ReleaseLinks";

export function DownloadPanel(): JSX.Element {
    return (
        <div className="mobile-cards download-panel-cards">
            <section
                className="section hero is-fullheight mobile-card"
                id="download"
            >
                <div className="hero-body">
                    <div className="container">
                        <ReleaseLinks />
                    </div>
                </div>
            </section>
        </div>
    );
}
