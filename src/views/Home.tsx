import React, { useRef, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import logo from "../assets/vex_icon.svg";
import haloRed from "../assets/halo-red.jpeg";
import girlRed from "../assets/girl-red.jpg";
import basedmilio from "../assets/FIRERED/basedmilio4.jpeg";
import { WitchyHero } from "../components/WitchyHero";
import { WitchyOrbs } from "../components/WitchyOrbs";
import { Navbar } from "../components/Hero";
import { PageIndicator } from "../components/PageIndicator";
import { Link, useHistory } from "react-router-dom";
import {
    DOWNLOAD_ENABLED,
    GITHUB_WEB_URLS,
    LOGO_TEXT,
    TWITTER_HANDLE,
    TWITTER_URL,
} from "../components/constants";

const SECTION_IDS = ["hero", "about", "features"];

export function Home() {
    const history = useHistory();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [indicatorShake, setIndicatorShake] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Down/Right = advance (next section); Up/Left = go back (matches scroll/carousel convention)
            const advanceKeys = ["ArrowDown", "ArrowRight"];
            const backKeys = ["ArrowUp", "ArrowLeft"];
            if (!advanceKeys.includes(e.key) && !backKeys.includes(e.key)) return;
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }
            const sections = SECTION_IDS.map((id) =>
                el.querySelector(`#${id}`)
            ).filter((s): s is HTMLElement => s !== null);
            if (sections.length === 0) return;

            const isHorizontal = el.scrollWidth > el.clientWidth;
            const scrollPos = isHorizontal ? el.scrollLeft : el.scrollTop;
            const viewSize = isHorizontal ? el.clientWidth : el.clientHeight;
            let currentIndex = 0;
            for (let i = 0; i < sections.length; i++) {
                const pos = isHorizontal
                    ? (sections[i] as HTMLElement).offsetLeft
                    : (sections[i] as HTMLElement).offsetTop;
                if (scrollPos < pos + viewSize / 2) {
                    currentIndex = i;
                    break;
                }
                currentIndex = i;
            }

            const advance = advanceKeys.includes(e.key);
            const goBack = backKeys.includes(e.key);
            if (advance && currentIndex < sections.length - 1) {
                e.preventDefault();
                sections[currentIndex + 1].scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                    inline: "start",
                });
            } else if (goBack && currentIndex > 0) {
                e.preventDefault();
                sections[currentIndex - 1].scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                    inline: "start",
                });
            } else if ((advance && currentIndex >= sections.length - 1) || (goBack && currentIndex <= 0)) {
                e.preventDefault();
                setIndicatorShake(true);
                setTimeout(() => setIndicatorShake(false), 400);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="app container">
            <Navbar />
            <PageIndicator scrollRef={scrollRef} shake={indicatorShake} />
            <div className="mobile-cards" ref={scrollRef}>
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
                                    <span className="card-header hero-logo">
                                        <span className="logo-glitch">
                                            <img
                                                src={logo}
                                                className="logo logo--square card-header__img"
                                                alt=""
                                            />
                                        </span>
                                        <span className="card-header__title card-title--aviation">
                                            {LOGO_TEXT}
                                        </span>
                                    </span>
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
                    </div>
                </section>

                <section className="section mobile-card" id="about">
                    <div className="columns container has-text-left is-vcentered about-columns">
                        <div className="column section-bg" aria-hidden>
                            <WitchyOrbs section="about" />
                        </div>
                        <div className="column is-12 section-content">
                            <div className="content-frame content">
                                <span className="card-header">
                                    <span className="card-header__img-wrap">
                                        <img
                                            src={girlRed}
                                            alt=""
                                            className="card-header__img"
                                        />
                                    </span>
                                    <span className="card-header__title card-title--aviation">
                                        PRIVACY IS NOT A CRIME
                                    </span>
                                </span>
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
                            <WitchyOrbs section="features" />
                        </div>
                        <div className="column is-12 section-content">
                            <div className="content-frame content">
                                <span className="card-header">
                                    <span className="card-header__img-wrap">
                                        <img
                                            src={basedmilio}
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
            </div>
        </div>
    );
}
