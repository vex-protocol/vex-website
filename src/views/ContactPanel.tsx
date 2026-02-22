import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";
import haloRed from "../assets/halo-red.jpeg";
import { WitchyOrbs } from "../components/WitchyOrbs";
import {
    GITHUB_WEB_URLS,
    TWITTER_HANDLE,
    TWITTER_URL,
} from "../components/constants";

const SOCIAL_LINKS = [
    {
        id: "twitter",
        label: "X (Twitter)",
        href: TWITTER_URL,
        ariaLabel: `Follow @${TWITTER_HANDLE} on X`,
        icon: faTwitter,
    },
    {
        id: "github",
        label: "GitHub",
        href: GITHUB_WEB_URLS.VEX_CHAT_ORG,
        ariaLabel: "Vex on GitHub",
        icon: faGithub,
    },
];

export function ContactPanel(): JSX.Element {
    return (
        <div className="mobile-cards contact-panel-cards">
            <section
                className="section hero is-fullheight hero--with-halo mobile-card"
                id="contact"
            >
                <div
                    className="hero-halo-bg"
                    style={{ backgroundImage: `url(${haloRed})` }}
                    aria-hidden
                />
                <div className="hero-body">
                    <div className="columns container has-text-left hero-columns">
                        <div className="column is-half section-bg" aria-hidden>
                            <WitchyOrbs
                                roomPath="/contact"
                                slotId="contact"
                                section="about"
                            />
                        </div>
                        <div className="column is-half section-content">
                            <div className="content-frame content">
                                <span className="card-header">
                                    <span className="card-header__title card-title--aviation">
                                        CONTACT
                                    </span>
                                </span>
                                <p className="subtitle">
                                    Connect with us on social.
                                </p>
                                <div className="contact-links">
                                    {SOCIAL_LINKS.map((link) => (
                                        <a
                                            key={link.id}
                                            href={link.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="button is-medium is-primary"
                                            aria-label={link.ariaLabel}
                                        >
                                            <FontAwesomeIcon
                                                icon={link.icon}
                                                className="icon-left"
                                            />
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
