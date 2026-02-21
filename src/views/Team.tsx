import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import { Hero } from "../components";
import { CEO_TWITTER_HANDLE, CEO_TWITTER_URL } from "../components/constants";

export function Team(): JSX.Element {
    return (
        <div className="view">
            <Hero
                content={
                    <div className="content is-large">
                        <h1 className="title">Team</h1>
                        <h2 className="subtitle is-size-5">
                            The people behind Vex
                        </h2>
                    </div>
                }
            />
            <section className="section">
                <div className="container">
                    <div className="columns is-centered">
                        <div className="column is-half">
                            <div className="card">
                                <div className="card-content">
                                    <div className="media">
                                        <div className="media-left">
                                            <a
                                                href={CEO_TWITTER_URL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="icon-circle icon-circle--xl"
                                                aria-label={`@${CEO_TWITTER_HANDLE} on X`}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTwitter}
                                                />
                                            </a>
                                        </div>
                                        <div className="media-content">
                                            <p className="title is-4">CEO</p>
                                            <p className="subtitle">
                                                <a
                                                    href={CEO_TWITTER_URL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    @{CEO_TWITTER_HANDLE}
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
