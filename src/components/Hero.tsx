import React, { Fragment, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";
import logo from "../assets/vex_icon.svg";
import {
    DOWNLOAD_ENABLED,
    GITHUB_WEB_URLS,
    LOGO_TEXT,
    TWITTER_HANDLE,
    TWITTER_URL,
} from "./constants";

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

const NAVBAR_MENU_CONTENT = (
    <>
        <Link className="navbar-item" to="/privacy-policy">
            Privacy Policy
        </Link>
        <span className="navbar-item navbar-icons">
            {!DOWNLOAD_ENABLED && (
                <a
                    href={TWITTER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-circle"
                    aria-label={`Follow @${TWITTER_HANDLE} on X`}
                >
                    <FontAwesomeIcon icon={faTwitter} />
                </a>
            )}
            <a
                href={GITHUB_WEB_URLS.VEX_CHAT_ORG}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-circle"
                aria-label="Vex on GitHub"
            >
                <FontAwesomeIcon icon={faGithub} />
            </a>
        </span>
        {DOWNLOAD_ENABLED && (
            <span className="navbar-item">
                <Link className="button is-primary" to="/download">
                    <span>DOWNLOAD</span>
                </Link>
            </span>
        )}
    </>
);

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        const isOutside = (target: EventTarget | null) => {
            const el = target as HTMLElement;
            return (
                menuOpen &&
                wrapperRef.current &&
                !wrapperRef.current.contains(el) &&
                !el?.closest?.(".navbar-menu--portaled")
            );
        };
        const onPointerDownOutside = (e: MouseEvent | TouchEvent) => {
            if (isOutside(e.target)) setMenuOpen(false);
        };
        // click for mouse, touchend for touch (faster tap response on mobile)
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("click", onPointerDownOutside);
        document.addEventListener("touchend", onPointerDownOutside, { passive: true });
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("click", onPointerDownOutside);
            document.removeEventListener("touchend", onPointerDownOutside);
        };
    }, [menuOpen]);

    const menuDropdown = menuOpen
        ? ReactDOM.createPortal(
              <div
                  className="navbar-menu navbar-menu--portaled is-active"
                  id="navbarMenuHeroC"
                  role="menu"
                  onClick={() => setMenuOpen(false)}
              >
                  <div className="navbar-end">{NAVBAR_MENU_CONTENT}</div>
              </div>,
              document.body
          )
        : null;

    const navbarEl = (
        <>
            <div className="navbar-sticky-wrapper" ref={wrapperRef}>
                <div className="navbar-halo navbar-halo--tint" />
                <header className="navbar navbar-over-halo">
                    <div className="container">
                        <div className="navbar-brand">
                            <Link
                                to={"/"}
                                className="logo-link navbar-item"
                                aria-label="Vex"
                            >
                                <span className="logo-glitch">
                                    <img
                                        className="logo logo--square"
                                        src={logo}
                                        alt=""
                                    />
                                </span>
                                <span className="logo-text">{LOGO_TEXT}</span>
                            </Link>
                            <span
                                className={`navbar-burger burger ${
                                    menuOpen ? "is-active" : ""
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => setMenuOpen(!menuOpen)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setMenuOpen(!menuOpen);
                                    }
                                }}
                                aria-expanded={menuOpen}
                                aria-label="Toggle menu"
                                data-target="navbarMenuHeroC"
                            >
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </div>
                    </div>
                </header>
            </div>
            {menuDropdown}
        </>
    );

    return ReactDOM.createPortal(navbarEl, document.body);
}
