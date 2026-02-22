import React, { useState, useCallback, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useInvertVertical } from "../context/InvertVerticalContext";

export function SettingsMenu(): JSX.Element {
    const [open, setOpen] = useState(false);
    const [invertVertical, setInvertVertical] = useInvertVertical();

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, close]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".settings-menu")) close();
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open, close]);

    return (
        <div className="settings-menu">
            <button
                type="button"
                className="settings-menu__trigger"
                onClick={() => setOpen(!open)}
                aria-label={open ? "Close settings" : "Open settings"}
                aria-expanded={open}
                aria-haspopup="true"
            >
                <FontAwesomeIcon icon={faCog} />
            </button>
            {open && (
                <div
                    className="settings-menu__panel"
                    role="menu"
                    aria-label="Settings"
                >
                    <div className="settings-menu__header">
                        <span className="settings-menu__title">Settings</span>
                        <button
                            type="button"
                            className="settings-menu__close"
                            onClick={close}
                            aria-label="Close"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    <div className="settings-menu__body">
                        <div
                            className="settings-menu__row"
                            role="button"
                            tabIndex={0}
                            onClick={() => setInvertVertical(!invertVertical)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setInvertVertical(!invertVertical);
                                }
                            }}
                            aria-label="Invert Y axis"
                            aria-pressed={invertVertical}
                        >
                            <span className="settings-menu__label">
                                Invert Y axis
                            </span>
                            <span className="settings-menu__hint">
                                {invertVertical
                                    ? "Swipe up = next section"
                                    : "Swipe up = previous section"}
                            </span>
                            <span
                                className={`settings-menu__toggle ${
                                    invertVertical
                                        ? "settings-menu__toggle--on"
                                        : ""
                                }`}
                                aria-hidden
                            >
                                <span className="settings-menu__toggle-track">
                                    <span className="settings-menu__toggle-knob" />
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
