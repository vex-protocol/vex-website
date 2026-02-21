import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import logo from "../assets/vex_icon.svg";
import haloRed from "../assets/halo-red.jpeg";
import { WitchyHero } from "../components/WitchyHero";
import { WitchyFeatures } from "../components/WitchyFeatures";
import { WitchyAbout } from "../components/WitchyAbout";
import { Navbar } from "../components/Hero";
import { Link, useHistory } from "react-router-dom";
import {
    DOWNLOAD_ENABLED,
    GITHUB_WEB_URLS,
    LOGO_TEXT,
    TWITTER_HANDLE,
    TWITTER_URL,
} from "../components/constants";

export function Home() {
    const history = useHistory();

    return (
        <div className="app container">
            <Navbar />
            <div className="mobile-cards">
                <section
                    className="section hero is-fullheight hero--with-halo mobile-card"
                    id="hero"
                >
                    <div
                        className="hero-halo-bg"
                        style={{ backgroundImage: `url(${haloRed})` }}
                        aria-hidden
                    />
                    <div className="hero-body">
                        <div className="columns container has-text-left hero-columns">
                            <div
                                className="column is-half section-bg"
                                aria-hidden
                            >
                                <WitchyHero />
                            </div>
                            <div className="column is-half section-content">
                                <div className="content-frame content">
                                    <span className="hero-logo">
                                        <span className="logo-glitch">
                                            <img
                                                src={logo}
                                                className="logo logo--square"
                                                alt=""
                                            />
                                        </span>
                                        <span className="logo-text">
                                            {LOGO_TEXT}
                                        </span>
                                    </span>
                                    <h2 className="title is-spaced is-2">
                                        Secure. Private. Encrypted.
                                    </h2>
                                    <p className="subtitle is-4">
                                        Simple privacy and powerful end to end
                                        encryption technology for communication.
                                        Real-time messaging with large groups of
                                        people or chatting with your friends
                                        without compromising your privacy.
                                    </p>
                                    {DOWNLOAD_ENABLED ? (
                                        <button
                                            onClick={() => {
                                                history.push("/download");
                                            }}
                                            className="button is-medium is-primary is-rounded"
                                        >
                                            Download Now
                                        </button>
                                    ) : (
                                        <a
                                            href={TWITTER_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="button is-medium is-primary is-rounded"
                                            aria-label={`Follow @${TWITTER_HANDLE} on X for updates`}
                                        >
                                            Follow us{" "}
                                            <FontAwesomeIcon
                                                icon={faTwitter}
                                                className="icon-right"
                                            />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section mobile-card" id="about">
                    <div className="columns container has-text-left is-vcentered about-columns">
                        <div className="column is-half section-bg" aria-hidden>
                            <WitchyAbout />
                        </div>
                        <div className="column is-half section-content">
                            <div className="content-frame content">
                                <h2 className="title card-title--aviation">
                                    PRIVACY IS NOT A CRIME
                                </h2>
                                <p className="subtitle">
                                    Vex Chat is a secure instant messaging
                                    platform for social and commercial use. A
                                    private place to share ideas that protects
                                    your identity and keeps you in control.
                                </p>
                                {DOWNLOAD_ENABLED ? (
                                    <button
                                        onClick={() => {
                                            history.push("/download");
                                        }}
                                        className="button is-medium is-primary is-rounded"
                                    >
                                        Download Now
                                    </button>
                                ) : (
                                    <a
                                        href={TWITTER_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="button is-medium is-primary is-rounded"
                                        aria-label={`Follow @${TWITTER_HANDLE} on X for updates`}
                                    >
                                        Follow us{" "}
                                        <FontAwesomeIcon
                                            icon={faTwitter}
                                            className="icon-right"
                                        />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section mobile-card" id="features">
                    <div className="columns container has-text-left features-columns">
                        <div className="column is-half section-content">
                            <div className="content-frame content">
                                <h2 className="title card-title--aviation">
                                    ENCRYPTED BY DEFAULT
                                </h2>
                                <h2 className="title">Your conversation</h2>
                                <p className="subtitle">
                                    Vex is open-source, encrypted and free. It
                                    connects you securely to any other Vex user,
                                    anywhere in the world.
                                </p>
                                <h2 className="title">Free of censorship</h2>
                                <p className="subtitle">
                                    Your messages are end to end encrypted,
                                    meaning we couldn&apos;t even read them if
                                    we wanted to.
                                </p>
                                <h2 className="title">No surveillance</h2>
                                <p className="subtitle">
                                    We collect as little data as possible to
                                    provide you with chat service. We don&apos;t
                                    spy on you or collect data for profit.
                                </p>
                                <div className="features-ctas">
                                    <Link
                                        to="/privacy-policy"
                                        className="button is-medium is-rounded is-primary is-outlined"
                                    >
                                        Privacy Policy
                                    </Link>
                                    <a
                                        href={GITHUB_WEB_URLS.VEX_CHAT_ORG}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="button is-medium is-rounded is-primary is-outlined"
                                    >
                                        Read the code
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="column is-half section-bg" aria-hidden>
                            <WitchyFeatures />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
