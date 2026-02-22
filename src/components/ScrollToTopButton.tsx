import React, { useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { useIsMobile } from "../hooks/useIsMobile";

type Props = {
    verticalScrollRef: React.RefObject<HTMLDivElement | null>;
    sectionIds: readonly string[];
};

export function ScrollToTopButton({
    verticalScrollRef,
    sectionIds,
}: Props): JSX.Element | null {
    const isMobile = useIsMobile();

    const scrollToTop = useCallback(() => {
        const panelEl = verticalScrollRef.current;
        if (!panelEl || sectionIds.length === 0) return;

        const scrollEl =
            (isMobile && panelEl.querySelector(".mobile-cards")) || panelEl;
        const firstSection = panelEl.querySelector(`#${sectionIds[0]}`);

        if (firstSection) {
            (firstSection as HTMLElement).scrollIntoView({
                behavior: "auto",
                block: "start",
            });
        } else {
            scrollEl.scrollTo({ top: 0, behavior: "auto" });
        }
    }, [verticalScrollRef, sectionIds, isMobile]);

    if (sectionIds.length <= 1) return null;

    return (
        <button
            type="button"
            className="scroll-to-top-button"
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            <FontAwesomeIcon icon={faArrowUp} />
        </button>
    );
}
