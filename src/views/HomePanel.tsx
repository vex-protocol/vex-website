import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";
import { WitchyHero } from "../components/WitchyHero";
import { useProceduralImages } from "../hooks/useProceduralImages";
import { WitchyOrbs } from "../components/WitchyOrbs";
import { Link, useHistory } from "react-router-dom";
import {
    DOWNLOAD_ENABLED,
    GITHUB_WEB_URLS,
    HERO_CARD_TAGLINE,
    TWITTER_HANDLE,
    TWITTER_URL,
} from "../components/constants";

export function HomePanel() {
    const history = useHistory();
    const { halo, card, card2, cardHero, cardContact } = useProceduralImages();

    return (
        <div className="mobile-cards home-panel-cards">
            <section
                className="section hero is-fullheight hero--with-halo mobile-card"
                id="hero"
            >
                <div
                    className="hero-halo-bg"
                    style={{ backgroundImage: `url(${halo})` }}
                    aria-hidden
                />
                <div className="columns container has-text-left about-columns">
                    <div className="column section-bg" aria-hidden>
                        <WitchyHero roomPath="/" />
                    </div>
                    <div className="column is-12 section-content">
                            <div
                                className="content-frame content-frame--crt content-frame--procedural content"
style={{
                                        ["--card-accent-color" as string]:
                                            cardHero.color,
                                        ["--card-accent-bg" as string]:
                                            cardHero.colorBg,
                                        ["--card-accent-glow" as string]:
                                            cardHero.color + "60",
                                        ["--card-accent-glow-strong" as string]:
                                            cardHero.color + "99",
                                    } as React.CSSProperties}
                            >
                                <span className="card-header">
                                    <span className="card-header__img-wrap">
                                        <img
                                            src={cardHero.image}
                                            alt=""
                                            className="card-header__img"
                                        />
                                    </span>
                                    <span className="card-header__title card-title--aviation">
                                        {HERO_CARD_TAGLINE}
                                    </span>
                                </span>
                                <p className="subtitle is-4">
                                    Simple privacy and powerful end to end
                                    encryption technology for communication.
                                    Real-time messaging with large groups of
                                    people or chatting with your friends without
                                    compromising your privacy.
                                </p>
                                {DOWNLOAD_ENABLED ? (
                                    <button
                                        onClick={() =>
                                            history.push({ pathname: "/download", search: "?depth=1" })
                                        }
                                        className="button is-medium is-primary"
                                    >
                                        Download Now
                                    </button>
                                ) : (
                                    <a
                                        href={TWITTER_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="button is-medium is-primary"
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

            <section className="section mobile-card" id="about">
                <div className="columns container has-text-left is-vcentered about-columns">
                    <div className="column section-bg" aria-hidden>
                        <WitchyOrbs
                            roomPath="/"
                            slotId="home-about"
                            section="about"
                        />
                    </div>
                    <div className="column is-12 section-content">
                        <div
                                className="content-frame content-frame--crt content-frame--procedural content"
                                style={{
                                    ["--card-accent-color" as string]:
                                        card.color,
                                    ["--card-accent-bg" as string]:
                                        card.colorBg,
                                    ["--card-accent-glow" as string]:
                                        card.color + "60",
                                    ["--card-accent-glow-strong" as string]:
                                        card.color + "99",
                                } as React.CSSProperties}
                            >
                            <span className="card-header">
                                <span className="card-header__img-wrap">
                                    <img
                                        src={card.image}
                                        alt=""
                                        className="card-header__img"
                                    />
                                </span>
                                <span className="card-header__title card-title--aviation">
                                    PRIVACY IS NOT A CRIME
                                </span>
                            </span>
                            <p className="subtitle">
                                Vex Chat is a secure instant messaging platform
                                for social and commercial use. A private place
                                to share ideas that protects your identity and
                                keeps you in control.
                            </p>
                            {DOWNLOAD_ENABLED ? (
                                <button
                                    onClick={() => history.push({ pathname: "/download", search: "?depth=1" })}
                                    className="button is-medium is-primary"
                                >
                                    Download Now
                                </button>
                            ) : (
                                <a
                                    href={TWITTER_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="button is-medium is-primary"
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
                    <div className="column section-bg" aria-hidden>
                        <WitchyOrbs
                            roomPath="/"
                            slotId="home-features"
                            section="features"
                        />
                    </div>
                    <div className="column is-12 section-content">
                        <div
                                className="content-frame content-frame--crt content-frame--procedural content"
                                style={{
                                    ["--card-accent-color" as string]:
                                        card2.color,
                                    ["--card-accent-bg" as string]:
                                        card2.colorBg,
                                    ["--card-accent-glow" as string]:
                                        card2.color + "60",
                                    ["--card-accent-glow-strong" as string]:
                                        card2.color + "99",
                                } as React.CSSProperties}
                            >
                            <span className="card-header">
                                <span className="card-header__img-wrap">
                                    <img
                                        src={card2.image}
                                        alt=""
                                        className="card-header__img"
                                    />
                                </span>
                                <span className="card-header__title card-title--aviation">
                                    ENCRYPTED BY DEFAULT
                                </span>
                            </span>
                            <h2 className="title">Your conversation</h2>
                            <p className="subtitle">
                                Vex is open-source, encrypted and free. It
                                connects you securely to any other Vex user,
                                anywhere in the world.
                            </p>
                            <h2 className="title">Free of censorship</h2>
                            <p className="subtitle">
                                Your messages are end to end encrypted, meaning
                                we couldn&apos;t even read them if we wanted to.
                            </p>
                            <h2 className="title">No surveillance</h2>
                            <p className="subtitle">
                                We collect as little data as possible to provide
                                you with chat service. We don&apos;t spy on you
                                or collect data for profit.
                            </p>
                            <div className="features-ctas">
                                <Link
                                    to="/privacy-policy"
                                    className="button is-small is-primary is-outlined"
                                >
                                    Privacy Policy
                                </Link>
                                <a
                                    href={GITHUB_WEB_URLS.VEX_CHAT_ORG}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="button is-small is-primary is-outlined"
                                >
                                    Read the code
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section
                className="section hero is-fullheight hero--with-halo mobile-card"
                id="contact"
            >
                <div
                    className="hero-halo-bg"
                    style={{ backgroundImage: `url(${halo})` }}
                    aria-hidden
                />
                <div className="columns container has-text-left about-columns">
                    <div className="column section-bg" aria-hidden>
                        <WitchyOrbs
                            roomPath="/"
                            slotId="contact"
                            section="about"
                        />
                    </div>
                    <div className="column is-12 section-content">
                            <div
                                className="content-frame content-frame--crt content-frame--procedural content"
style={{
                                        ["--card-accent-color" as string]:
                                            cardContact.color,
                                        ["--card-accent-bg" as string]:
                                            cardContact.colorBg,
                                        ["--card-accent-glow" as string]:
                                            cardContact.color + "60",
                                        ["--card-accent-glow-strong" as string]:
                                            cardContact.color + "99",
                                    } as React.CSSProperties}
                            >
                                <span className="card-header">
                                    <span className="card-header__img-wrap">
                                        <img
                                            src={cardContact.image}
                                            alt=""
                                            className="card-header__img"
                                        />
                                    </span>
                                    <span className="card-header__title card-title--aviation">
                                        CONTACT
                                    </span>
                                </span>
                                <p className="subtitle">
                                    Connect with us on social.
                                </p>
                                <div className="contact-links">
                                    <a
                                        href={TWITTER_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="button is-medium is-primary"
                                        aria-label={`Follow @${TWITTER_HANDLE} on X`}
                                    >
                                        <FontAwesomeIcon
                                            icon={faTwitter}
                                            className="icon-left"
                                        />
                                        X (Twitter)
                                    </a>
                                    <a
                                        href={GITHUB_WEB_URLS.VEX_CHAT_ORG}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="button is-medium is-primary"
                                        aria-label="Vex on GitHub"
                                    >
                                        <FontAwesomeIcon
                                            icon={faGithub}
                                            className="icon-left"
                                        />
                                        GitHub
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
            </section>
        </div>
    );
}
