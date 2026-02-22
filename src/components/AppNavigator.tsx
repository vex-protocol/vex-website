import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useLayoutEffect,
    useMemo,
} from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Navbar } from "./Hero";
import { PositionGauge } from "./PositionGauge";
import {
    LATERAL_ROUTES,
    routeIndex,
    pathForIndex,
} from "../navigation/routeConfig";
import { HomePanel, ContactPanel, PrivacyPanel, DownloadPanel } from "../views";

const PANELS: Record<string, () => JSX.Element> = {
    "/": () => <HomePanel />,
    "/privacy-policy": () => <PrivacyPanel />,
    "/contact": () => <ContactPanel />,
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

    const currentRouteIdx = routeIndex(location.pathname);
    const sectionIds = useMemo(
        () => LATERAL_ROUTES[currentRouteIdx]?.sectionIds ?? [],
        [currentRouteIdx]
    );

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

            const scrollPos = el.scrollTop;
            const viewSize = el.clientHeight;
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
        [currentVerticalRef, sectionIds]
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
                goSection(-1);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                goSection(1);
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
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            if (dx > 0) goRoute(-1);
            else goRoute(1);
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
            <PositionGauge
                lateralIndex={currentRouteIdx}
                verticalScrollRef={{ current: currentVerticalRef }}
                sectionIds={sectionIds}
                shake={indicatorShake}
                attemptDirection={attemptDirection}
            />
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
