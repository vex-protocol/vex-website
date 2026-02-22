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

    return (
        <button
            type="button"
            className="scroll-to-top-button"
            onClick={() => scrollToTop()}
            aria-label="Scroll to top"
        >
            <FontAwesomeIcon icon={faArrowUp} />
        </button>
    );
}
