import React, { useState, useCallback, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faTimes } from "@fortawesome/free-solid-svg-icons";

export function SettingsMenu(): JSX.Element {
    const [open, setOpen] = useState(false);
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
                        {/* Placeholder for future settings */}
                    </div>
                </div>
            )}
        </div>
    );
}
