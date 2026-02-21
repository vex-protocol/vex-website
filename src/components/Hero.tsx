import React, { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../images/vex-logo.svg";
import { DOWNLOAD_ENABLED } from "./constants";

export function Hero(props: { content: JSX.Element }): JSX.Element {
    return (
        <Fragment>
            <Navbar />
            <section className="hero is-large" id="home">
                <div className="hero-head"></div>

                <div className="hero-body">
                    <div className="container">{props.content}</div>
                </div>
            </section>
        </Fragment>
    );
}

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="navbar-sticky-wrapper">
            <div className="navbar-halo navbar-halo--tint" />
            <header className="navbar navbar-over-halo">
                <div className="container">
                    <div className="navbar-brand">
                        <Link to={"/"} className="logo-link navbar-item">
                            <img className="logo" src={logo} alt={"Vex"} />
                        </Link>
                        <span
                            className={`navbar-burger burger ${
                                menuOpen ? "is-active" : ""
                            }`}
                            onClick={() => setMenuOpen(!menuOpen)}
                            data-target="navbarMenuHeroC"
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                    </div>
                    <div
                        id="navbarMenuHeroC"
                        className={`navbar-menu ${menuOpen ? "is-active" : ""}`}
                    >
                        <div className="navbar-end">
                            <Link className="navbar-item" to="/privacy-policy">
                                Privacy Policy
                            </Link>
                            {DOWNLOAD_ENABLED && (
                                <span className="navbar-item">
                                    <Link
                                        className="button is-primary is-rounded"
                                        to="/download"
                                    >
                                        <span>DOWNLOAD</span>
                                    </Link>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}
