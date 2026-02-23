import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { useRespawn } from "../context/RespawnContext";
import { useIsMobile } from "../hooks/useIsMobile";

type Props = {
    sectionIds: readonly string[];
};

export function ScrollToTopButton({ sectionIds }: Props): JSX.Element | null {
    const { scrollToTop } = useRespawn();
    const isMobile = useIsMobile();

    if (sectionIds.length === 0 || isMobile) return null;

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
