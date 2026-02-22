import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useLayoutEffect,
} from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Navbar } from "./Hero";
import { PositionGauge } from "./PositionGauge";
import {
    LATERAL_ROUTES,
    routeIndex,
    pathForIndex,
} from "../navigation/routeConfig";
import { useRouteSections } from "../context/RouteSectionsContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { SettingsMenu } from "./SettingsMenu";
import { ScrollToTopButton } from "./ScrollToTopButton";
import { HomePanel, PrivacyPanel, DownloadPanel } from "../views";

const PANELS: Record<string, () => JSX.Element> = {
    "/": () => <HomePanel />,
    "/privacy-policy": () => <PrivacyPanel />,
    "/download": () => <DownloadPanel />,
};

export function AppNavigator(): JSX.Element {
    const history = useHistory();
    const location = useLocation();
    const lateralRef = useRef<HTMLDivElement | null>(null);
    const verticalRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
    const [indicatorShake, setIndicatorShake] = useState(false);
    const [attemptDirection, setAttemptDirection] = useState<
        "left" | "right" | "up" | "down" | null
    >(null);
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const programmaticScrollRef = useRef(false);

    const isMobile = useIsMobile();
    /** Down/right = next section, Up/left = prev (natural direction mapping) */
    const invertVertical = false;
    const currentRouteIdx = routeIndex(location.pathname);
    const configSectionIds = LATERAL_ROUTES[currentRouteIdx]?.sectionIds ?? [];
    const sectionIds = useRouteSections(location.pathname, configSectionIds);

    const currentVerticalRef =
        verticalRefs.current.get(currentRouteIdx) ?? null;

    // Scroll lateral strip when pathname changes (e.g. from nav links, keyboard)
    useLayoutEffect(() => {
        const el = lateralRef.current;
        if (!el) return;
        const idx = routeIndex(location.pathname);
        programmaticScrollRef.current = true;
        el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
        const t = setTimeout(() => {
            programmaticScrollRef.current = false;
        }, 400);
        return () => clearTimeout(t);
    }, [location.pathname]);

    // Update URL when user swipes lateral strip to a new panel
    useEffect(() => {
        const el = lateralRef.current;
        if (!el) return;
        let raf: number;
        const handleScroll = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                if (programmaticScrollRef.current) return;
                const panelWidth = el.clientWidth;
                if (panelWidth <= 0) return;
                const idx = Math.round(el.scrollLeft / panelWidth);
                const path = pathForIndex(
                    Math.max(0, Math.min(idx, LATERAL_ROUTES.length - 1))
                );
                if (path !== location.pathname) {
                    history.replace(path);
                }
                raf = 0;
            });
        };
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", handleScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [history, location.pathname]);

    const goRoute = useCallback(
        (delta: number) => {
            const next = currentRouteIdx + delta;
            if (next < 0 || next >= LATERAL_ROUTES.length) {
                setAttemptDirection(delta < 0 ? "left" : "right");
                setIndicatorShake(true);
                setTimeout(() => {
                    setIndicatorShake(false);
                    setAttemptDirection(null);
                }, 400);
                return;
            }
            history.push(pathForIndex(next));
        },
        [currentRouteIdx, history]
    );

    const goSection = useCallback(
        (delta: number) => {
            const el = currentVerticalRef;
            if (!el || sectionIds.length === 0) return;
            const sections = sectionIds
                .map((id) => el.querySelector(`#${id}`))
                .filter((s): s is HTMLElement => s !== null);
            if (sections.length === 0) return;

            const scrollEl =
                (isMobile && el.querySelector(".mobile-cards")) || el;
            const scrollPos = scrollEl.scrollTop;
            const viewSize = scrollEl.clientHeight;
            let currentIndex = 0;
            for (let i = 0; i < sections.length; i++) {
                const pos = sections[i].offsetTop;
                if (scrollPos < pos + viewSize / 2) {
                    currentIndex = i;
                    break;
                }
                currentIndex = i;
            }

            const next = currentIndex + delta;
            if (next < 0 || next >= sections.length) {
                setAttemptDirection(delta < 0 ? "up" : "down");
                setIndicatorShake(true);
                setTimeout(() => {
                    setIndicatorShake(false);
                    setAttemptDirection(null);
                }, 400);
                return;
            }
            sections[next].scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        },
        [currentVerticalRef, sectionIds, isMobile]
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                goRoute(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                goRoute(1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                goSection(invertVertical ? 1 : -1);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                goSection(invertVertical ? -1 : 1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goRoute, goSection]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        touchStart.current = null;
        const threshold = 50;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Horizontal: lateral route change
        if (absDx > absDy && absDx > threshold) {
            if (dx > 0) goRoute(-1);
            else goRoute(1);
            return;
        }
        // Vertical: section change
        if (absDy > absDx && absDy > threshold) {
            if (sectionIds.length > 0) {
                const deltaUp = invertVertical ? 1 : -1;
                const deltaDown = invertVertical ? -1 : 1;
                if (isMobile) {
                    // Mobile: each section = full page, no scroll – always allow
                    if (dy < 0) goSection(deltaUp);
                    else goSection(deltaDown);
                } else {
                    // Desktop: only at scroll boundaries to avoid fighting native scroll
                    const el = currentVerticalRef;
                    if (el) {
                        const { scrollTop, scrollHeight, clientHeight } = el;
                        const atTop = scrollTop <= 15;
                        const atBottom =
                            scrollTop >= scrollHeight - clientHeight - 15;
                        if (dy < 0 && atTop) goSection(deltaUp);
                        else if (dy > 0 && atBottom) goSection(deltaDown);
                    }
                }
            }
        }
    };

    const setVerticalRef = useCallback(
        (idx: number, el: HTMLDivElement | null) => {
            if (el) verticalRefs.current.set(idx, el);
        },
        []
    );

    return (
        <div className="app app-navigator">
            <Navbar />
            <div className="app-control-panel">
                <div className="app-control-panel__actions">
                    <ScrollToTopButton
                        verticalScrollRef={{ current: currentVerticalRef }}
                        sectionIds={sectionIds}
                    />
                    <SettingsMenu />
                </div>
                <PositionGauge
                    lateralIndex={currentRouteIdx}
                    verticalScrollRef={{ current: currentVerticalRef }}
                    sectionIds={sectionIds}
                    shake={indicatorShake}
                    attemptDirection={attemptDirection}
                    invertVertical={invertVertical}
                    onAttemptAtBoundary={(dir) => {
                        setAttemptDirection(dir);
                        setIndicatorShake(true);
                        setTimeout(() => {
                            setIndicatorShake(false);
                            setAttemptDirection(null);
                        }, 400);
                    }}
                />
            </div>
            <div
                className="lateral-strip"
                ref={lateralRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {LATERAL_ROUTES.map((route, idx) => (
                    <div
                        key={route.path}
                        className="route-panel"
                        ref={(el) => setVerticalRef(idx, el)}
                    >
                        {PANELS[route.path]?.() ?? null}
                    </div>
                ))}
            </div>
        </div>
    );
}
