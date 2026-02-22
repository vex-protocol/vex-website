import React from "react";
import haloRed from "../assets/halo-red.jpeg";
import { WitchyOrbs } from "../components/WitchyOrbs";
import { ReleaseLinks } from "../components/ReleaseLinks";

export function DownloadPanel(): JSX.Element {
    return (
        <div className="mobile-cards download-panel-cards">
            <section
                className="section hero is-fullheight hero--with-halo mobile-card"
                id="download-hero"
            >
                <div
                    className="hero-halo-bg"
                    style={{ backgroundImage: `url(${haloRed})` }}
                    aria-hidden
                />
                <div className="columns container has-text-left about-columns">
                    <div className="column section-bg" aria-hidden>
                        <WitchyOrbs
                            roomPath="/download"
                            slotId="download-hero"
                            section="about"
                        />
                    </div>
                    <div className="column section-content">
                            <div className="content-frame content">
                                <span className="card-header">
                                    <span className="card-header__title card-title--aviation">
                                        DOWNLOAD
                                    </span>
                                </span>
                                <p className="subtitle">
                                    Get Vex for your platform. Free and open
                                    source.
                                </p>
                            </div>
                        </div>
                    </div>
            </section>

            <section className="section mobile-card" id="download-releases">
                <div className="columns container has-text-left about-columns">
                    <div className="column section-bg" aria-hidden>
                        <WitchyOrbs
                            roomPath="/download"
                            slotId="download-releases"
                            section="features"
                        />
                    </div>
                    <div className="column section-content">
                        <div className="content-frame content">
                            <ReleaseLinks />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
