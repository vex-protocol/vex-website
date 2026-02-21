import React from "react";
import ReactDOM from "react-dom";

export function Footer(): JSX.Element {
    const footer = (
        <footer className="footer-sticky">
            <span className="footer-copyright">
                © 2026 Vex Heavy Industries LLC
            </span>
        </footer>
    );
    return ReactDOM.createPortal(footer, document.body);
}
