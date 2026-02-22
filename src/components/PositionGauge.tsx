import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHistory } from "react-router-dom";
import { LATERAL_ROUTES, pathForIndex } from "../navigation/routeConfig";
import { useIsMobile } from "../hooks/useIsMobile";

type Props = {
    lateralIndex: number;
    verticalScrollRef: React.RefObject<HTMLDivElement | null>;
    sectionIds: readonly string[];
    shake?: boolean;
    attemptDirection?: "left" | "right" | "up" | "down" | null;
    invertVertical?: boolean;
    onAttemptAtBoundary?: (direction: "left" | "right" | "up" | "down") => void;
};

/** Plus-shaped gauge: center = current (x,y), arms = available moves */
const SWIPE_THRESHOLD = 40;

export function PositionGauge({
    lateralIndex,
    verticalScrollRef,
    sectionIds,
    shake,
    attemptDirection = null,
    invertVertical = true,
    onAttemptAtBoundary,
}: Props): JSX.Element {
    const history = useHistory();
    const isMobile = useIsMobile();
    const [verticalIndex, setVerticalIndex] = useState(0);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const updateVerticalIndex = useCallback(() => {
        const panelEl = verticalScrollRef.current;
        if (!panelEl || sectionIds.length === 0) return;
        const sections = sectionIds
            .map((id) => panelEl.querySelector(`#${id}`))
            .filter((s): s is HTMLElement => s !== null);
        if (sections.length === 0) return;

        const scrollEl =
            (isMobile && panelEl.querySelector(".mobile-cards")) || panelEl;
        const scrollPos = scrollEl.scrollTop;
        const viewSize = scrollEl.clientHeight;
        let index = 0;
        for (let i = 0; i < sections.length; i++) {
            const pos = sections[i].offsetTop;
            if (scrollPos < pos + viewSize / 2) {
                index = i;
                break;
            }
            index = i;
        }
        setVerticalIndex(index);
    }, [verticalScrollRef, sectionIds, isMobile]);

    useEffect(() => {
        const panelEl = verticalScrollRef.current;
        if (!panelEl) return;
        const scrollEl =
            (isMobile && panelEl.querySelector(".mobile-cards")) || panelEl;
        updateVerticalIndex();
        scrollEl.addEventListener("scroll", updateVerticalIndex);
        window.addEventListener("resize", updateVerticalIndex);
        return () => {
            scrollEl.removeEventListener("scroll", updateVerticalIndex);
            window.removeEventListener("resize", updateVerticalIndex);
        };
    }, [verticalScrollRef, updateVerticalIndex, isMobile]);

    const goToLateral = useCallback(
        (index: number) => {
            history.push(pathForIndex(index));
        },
        [history]
    );

    const goToVertical = useCallback(
        (index: number) => {
            const el = verticalScrollRef.current;
            if (!el) return;
            const section = el.querySelector(`#${sectionIds[index]}`);
            if (section) {
                (section as HTMLElement).scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        },
        [sectionIds, verticalScrollRef]
    );

    const hasWest = lateralIndex > 0;
    const hasEast = lateralIndex < LATERAL_ROUTES.length - 1;
    const hasNorth = verticalIndex > 0;
    const hasSouth = verticalIndex < sectionIds.length - 1;

    const handleSwipeStart = useCallback((e: React.TouchEvent) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };
    }, []);

    const handleSwipeEnd = useCallback(
        (e: React.TouchEvent) => {
            if (!touchStart.current) return;
            const dx = e.changedTouches[0].clientX - touchStart.current.x;
            const dy = e.changedTouches[0].clientY - touchStart.current.y;
            touchStart.current = null;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
                if (dx > 0) {
                    if (hasWest) goToLateral(lateralIndex - 1);
                    else onAttemptAtBoundary?.("left");
                } else {
                    if (hasEast) goToLateral(lateralIndex + 1);
                    else onAttemptAtBoundary?.("right");
                }
                return;
            }
            if (absDy > absDx && absDy > SWIPE_THRESHOLD) {
                const deltaUp = invertVertical ? 1 : -1;
                const deltaDown = invertVertical ? -1 : 1;
                if (dy < 0) {
                    const nextIdx = verticalIndex + deltaUp;
                    if (nextIdx >= 0 && nextIdx < sectionIds.length)
                        goToVertical(nextIdx);
                    else onAttemptAtBoundary?.("up");
                } else {
                    const nextIdx = verticalIndex + deltaDown;
                    if (nextIdx >= 0 && nextIdx < sectionIds.length)
                        goToVertical(nextIdx);
                    else onAttemptAtBoundary?.("down");
                }
            }
        },
        [
            hasWest,
            hasEast,
            lateralIndex,
            verticalIndex,
            sectionIds.length,
            invertVertical,
            onAttemptAtBoundary,
            goToLateral,
            goToVertical,
        ]
    );

    const ArmTile = ({
        available,
        label,
        onClick,
    }: {
        available: boolean;
        label: string;
        onClick?: () => void;
    }) => {
        const baseClass = "position-gauge__round";
        const stateClass = available
            ? "position-gauge__round--available"
            : "position-gauge__round--unavailable";
        const content = <span className="position-gauge__round-inner" />;
        if (available && onClick) {
            return (
                <button
                    type="button"
                    aria-label={label}
                    className={`${baseClass} ${stateClass}`}
                    onClick={onClick}
                >
                    {content}
                </button>
            );
        }
        return (
            <div className={`${baseClass} ${stateClass}`} aria-hidden>
                {content}
            </div>
        );
    };

    return (
        <div
            className={`position-gauge position-gauge--plus ${
                shake ? "position-gauge--shake" : ""
            }`}
            role="group"
            aria-label="Position gauge"
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
        >
            <div className="position-gauge__cross">
                {/* North: prev section (y-1) */}
                <div
                    className={`position-gauge__arm position-gauge__arm--n ${
                        attemptDirection === "up"
                            ? "position-gauge__arm--flicker"
                            : ""
                    }`}
                >
                    <ArmTile
                        available={hasNorth}
                        label="Previous section"
                        onClick={
                            hasNorth
                                ? () => goToVertical(verticalIndex - 1)
                                : undefined
                        }
                    />
                </div>
                {/* Center: (x,y) reticle indicator */}
                <div className="position-gauge__arm position-gauge__arm--c">
                    <div
                        className="position-gauge__round position-gauge__round--center"
                        aria-label={`Position ${lateralIndex + 1}, ${
                            verticalIndex + 1
                        }`}
                    >
                        <div className="position-gauge__reticle">
                            <span className="position-gauge__reticle-cross position-gauge__reticle-cross--h" />
                            <span className="position-gauge__reticle-cross position-gauge__reticle-cross--v" />
                            <span className="position-gauge__reticle-dot" />
                            <span className="position-gauge__reticle-ring" />
                            <span
                                className="position-gauge__coords"
                                aria-hidden
                            >
                                {lateralIndex + 1},{verticalIndex + 1}
                            </span>
                        </div>
                    </div>
                </div>
                {/* South: next section (y+1) */}
                <div
                    className={`position-gauge__arm position-gauge__arm--s ${
                        attemptDirection === "down"
                            ? "position-gauge__arm--flicker"
                            : ""
                    }`}
                >
                    <ArmTile
                        available={hasSouth}
                        label="Next section"
                        onClick={
                            hasSouth
                                ? () => goToVertical(verticalIndex + 1)
                                : undefined
                        }
                    />
                </div>
                {/* West: prev route (x-1) */}
                <div
                    className={`position-gauge__arm position-gauge__arm--w ${
                        attemptDirection === "left"
                            ? "position-gauge__arm--flicker"
                            : ""
                    }`}
                >
                    <ArmTile
                        available={hasWest}
                        label="Previous route"
                        onClick={
                            hasWest
                                ? () => goToLateral(lateralIndex - 1)
                                : undefined
                        }
                    />
                </div>
                {/* East: next route (x+1) */}
                <div
                    className={`position-gauge__arm position-gauge__arm--e ${
                        attemptDirection === "right"
                            ? "position-gauge__arm--flicker"
                            : ""
                    }`}
                >
                    <ArmTile
                        available={hasEast}
                        label="Next route"
                        onClick={
                            hasEast
                                ? () => goToLateral(lateralIndex + 1)
                                : undefined
                        }
                    />
                </div>
            </div>
        </div>
    );
}
