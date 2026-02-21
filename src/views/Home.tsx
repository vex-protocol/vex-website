import React from "react";
import logo from "../images/vex-logo.svg";
import haloRed from "../assets/halo-red.jpeg";
import conversation from "../images/conversation.svg";
import secure from "../images/secure.svg";
import privacy from "../images/private.svg";
import { WitchyHero } from "../components/WitchyHero";
import { WitchyFeatures } from "../components/WitchyFeatures";
import { WitchyAbout } from "../components/WitchyAbout";
import { Navbar } from "../components/Hero";
import { useHistory } from "react-router-dom";
import { DOWNLOAD_ENABLED } from "../components/constants";

export function Home() {
    const history = useHistory();

    return (
        <div className="app container">
            <Navbar />
            <section className="section hero is-fullheight hero--with-halo" id="hero">
                <div
                    className="hero-halo-bg"
                    style={{ backgroundImage: `url(${haloRed})` }}
                    aria-hidden
                />
                <div className="hero-body">
                    <div className="columns container has-text-left ">
                        <div className="column is-half">
                            <WitchyHero />
                        </div>
                        <div className="column is-half content">
                            <img src={logo} width="192" alt={"Vex"} />
                            <h2 className="title is-spaced is-2">
                                Secure. Private. Encrypted.
                            </h2>
                            <p className="subtitle is-4">
                                Simple privacy and powerful end to end
                                encryption technology for communication.
                                Real-time messaging with large groups of people
                                or chatting with your friends without
                                compromising your privacy.
                            </p>
                            {DOWNLOAD_ENABLED && (
                                <button
                                    onClick={() => {
                                        history.push("/download");
                                    }}
                                    className="button is-medium is-primary is-rounded"
                                >
                                    Download Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="section" id="about">
                <div className="columns container has-text-left is-vcentered">
                    <div className="column is-half">
                        <WitchyAbout />
                    </div>
                    <div className="column is-half content">
                        <h2 className="title">
                            Private and secure messaging for everyone,
                            everywhere.
                        </h2>
                        <p className="subtitle">
                            Vex Chat is a secure instant messaging platform for
                            social and commercial use. A private place to share
                            ideas that protects your identity and keeps you in
                            control.
                        </p>
                        {DOWNLOAD_ENABLED && (
                            <button
                                onClick={() => {
                                    history.push("/download");
                                }}
                                className="button is-medium is-primary is-rounded"
                            >
                                Download Now
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="section" id="features">
                <div className="columns container has-text-left">
                    <div className="column is-half content">
                        <div className="media">
                            <figure className="media-left">
                                <p className="image is-64x64">
                                    <img src={conversation} alt={"Icon"} />
                                </p>
                            </figure>
                            <div className="media-content">
                                <div className="content">
                                    <h2 className="">Your conversation</h2>
                                    <p className="subtitle">
                                        Vex is open-source, encrypted and free.
                                        It connects you securely to any other
                                        Vex user, anywhere in the world
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="media">
                            <figure className="media-left">
                                <p className="image is-64x64">
                                    <img src={secure} alt={"Icon"} />
                                </p>
                            </figure>
                            <div className="media-content">
                                <div className="content">
                                    <h2 className="">Free of censorship</h2>
                                    <p className="subtitle">
                                        Your messages are end to end encrypted,
                                        meaning we couldn't even read them if we
                                        wanted to.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="media">
                            <figure className="media-left">
                                <p className="image is-64x64">
                                    <img src={privacy} alt={"Icon"} />
                                </p>
                            </figure>
                            <div className="media-content">
                                <div className="content">
                                    <h2 className="">No surveillance</h2>
                                    <p className="subtitle">
                                        We collect as little data as possible to
                                        provide you with chat service. We don't
                                        spy on you or collect data for profit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="column is-half">
                        <WitchyFeatures />
                    </div>
                </div>
            </section>
        </div>
    );
}
