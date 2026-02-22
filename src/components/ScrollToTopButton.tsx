import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { useRespawn } from "../context/RespawnContext";

type Props = {
    sectionIds: readonly string[];
};

export function ScrollToTopButton({ sectionIds }: Props): JSX.Element | null {
    const { scrollToTop } = useRespawn();

    if (sectionIds.length === 0) return null;

    const isMac =
        typeof navigator !== "undefined" &&
        navigator.platform?.toLowerCase().includes("mac");
    const shortcut = isMac ? "⌘+↑" : "Ctrl+↑";

    return (
        <button
            type="button"
            className="scroll-to-top-button"
            onClick={() => scrollToTop()}
            aria-label="Scroll to top"
            title={`Scroll to top (${shortcut})`}
        >
            <FontAwesomeIcon icon={faArrowUp} />
        </button>
    );
}
