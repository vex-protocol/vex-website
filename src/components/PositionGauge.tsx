import React, { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { LATERAL_ROUTES, pathForIndex } from "../navigation/routeConfig";

type Props = {
    lateralIndex: number;
    verticalScrollRef: React.RefObject<HTMLDivElement | null>;
    sectionIds: readonly string[];
    shake?: boolean;
};

/** Plus-shaped gauge: center = current (x,y), arms = available moves */
export function PositionGauge({
    lateralIndex,
    verticalScrollRef,
    sectionIds,
    shake,
}: Props): JSX.Element {
    const history = useHistory();
    const [verticalIndex, setVerticalIndex] = useState(0);

    const updateVerticalIndex = useCallback(() => {
        const el = verticalScrollRef.current;
        if (!el || sectionIds.length === 0) return;
        const sections = sectionIds
            .map((id) => el.querySelector(`#${id}`))
            .filter((s): s is HTMLElement => s !== null);
        if (sections.length === 0) return;

        const scrollPos = el.scrollTop;
        const viewSize = el.clientHeight;
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
    }, [verticalScrollRef, sectionIds]);

    useEffect(() => {
        const el = verticalScrollRef.current;
        if (!el) return;
        updateVerticalIndex();
        el.addEventListener("scroll", updateVerticalIndex);
        window.addEventListener("resize", updateVerticalIndex);
        return () => {
            el.removeEventListener("scroll", updateVerticalIndex);
            window.removeEventListener("resize", updateVerticalIndex);
        };
    }, [verticalScrollRef, updateVerticalIndex]);

    const goToLateral = (index: number) => {
        history.push(pathForIndex(index));
    };

    const goToVertical = (index: number) => {
        const el = verticalScrollRef.current;
        if (!el) return;
        const section = el.querySelector(`#${sectionIds[index]}`);
        if (section) {
            (section as HTMLElement).scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    };

    const hasWest = lateralIndex > 0;
    const hasEast = lateralIndex < LATERAL_ROUTES.length - 1;
    const hasNorth = verticalIndex > 0;
    const hasSouth = verticalIndex < sectionIds.length - 1;

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
            className={`position-gauge position-gauge--plus ${shake ? "position-gauge--shake" : ""}`}
            role="group"
            aria-label="Position gauge"
        >
            <div className="position-gauge__cross">
                {/* North: prev section (y-1) */}
                <div className="position-gauge__arm position-gauge__arm--n">
                    <ArmTile
                        available={hasNorth}
                        label="Previous section"
                        onClick={hasNorth ? () => goToVertical(verticalIndex - 1) : undefined}
                    />
                </div>
                {/* Center: current position (fire red orb in same cube) */}
                <div className="position-gauge__arm position-gauge__arm--c">
                    <div className="position-gauge__round position-gauge__round--center" aria-hidden>
                        <span className="position-gauge__round-inner" />
                    </div>
                </div>
                {/* South: next section (y+1) */}
                <div className="position-gauge__arm position-gauge__arm--s">
                    <ArmTile
                        available={hasSouth}
                        label="Next section"
                        onClick={hasSouth ? () => goToVertical(verticalIndex + 1) : undefined}
                    />
                </div>
                {/* West: prev route (x-1) */}
                <div className="position-gauge__arm position-gauge__arm--w">
                    <ArmTile
                        available={hasWest}
                        label="Previous route"
                        onClick={hasWest ? () => goToLateral(lateralIndex - 1) : undefined}
                    />
                </div>
                {/* East: next route (x+1) */}
                <div className="position-gauge__arm position-gauge__arm--e">
                    <ArmTile
                        available={hasEast}
                        label="Next route"
                        onClick={hasEast ? () => goToLateral(lateralIndex + 1) : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
