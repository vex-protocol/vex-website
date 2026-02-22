import React, { useState, useEffect, useCallback } from "react";

const DEFAULT_SECTION_IDS = ["hero", "about", "features"] as const;

type Props = {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    shake?: boolean;
    sectionIds?: readonly string[];
};

/** Ammo-gauge style page indicator – gunplane inspired, shows current section */
export function PageIndicator({
    scrollRef,
    shake,
    sectionIds = DEFAULT_SECTION_IDS,
}: Props): JSX.Element {
    const [currentIndex, setCurrentIndex] = useState(0);

    const updateIndex = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const sections = sectionIds
            .map((id) => el.querySelector(`#${id}`))
            .filter((s): s is HTMLElement => s !== null);
        if (sections.length === 0) return;

        const isHorizontal = el.scrollWidth > el.clientWidth;
        const scrollPos = isHorizontal ? el.scrollLeft : el.scrollTop;
        const viewSize = isHorizontal ? el.clientWidth : el.clientHeight;
        let index = 0;
        for (let i = 0; i < sections.length; i++) {
            const pos = isHorizontal
                ? sections[i].offsetLeft
                : sections[i].offsetTop;
            if (scrollPos < pos + viewSize / 2) {
                index = i;
                break;
            }
            index = i;
        }
        setCurrentIndex(index);
    }, [scrollRef, sectionIds]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateIndex();
        el.addEventListener("scroll", updateIndex);
        window.addEventListener("resize", updateIndex);
        return () => {
            el.removeEventListener("scroll", updateIndex);
            window.removeEventListener("resize", updateIndex);
        };
    }, [scrollRef, updateIndex]);

    const goTo = (index: number) => {
        const el = scrollRef.current;
        if (!el) return;
        const section = el.querySelector(`#${sectionIds[index]}`);
        if (section) {
            (section as HTMLElement).scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "start",
            });
        }
    };

    return (
        <div
            className={`page-indicator ${shake ? "page-indicator--shake" : ""}`}
            role="tablist"
            aria-label="Page navigation"
        >
            <div className="page-indicator__rounds">
                {sectionIds.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === currentIndex}
                        aria-label={`Go to page ${i + 1}`}
                        className={`page-indicator__round ${
                            i === currentIndex
                                ? "page-indicator__round--loaded"
                                : "page-indicator__round--spent"
                        }`}
                        onClick={() => goTo(i)}
                    >
                        <span className="page-indicator__round-inner" />
                    </button>
                ))}
            </div>
        </div>
    );
}
