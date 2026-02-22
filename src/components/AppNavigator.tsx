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
import { ScrollToTopButton } from "./ScrollToTopButton";
import { HomePanel, PrivacyPanel, DownloadPanel } from "../views";
import { RespawnProvider } from "../context/RespawnContext";
import { invalidateRoomCache } from "../assets/orbImages";

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
    const wheelAccum = useRef({ x: 0, y: 0 });
    const lastWheelTime = useRef(0);
    const wheelLockoutUntil = useRef(0);

    const isMobile = useIsMobile();
    /** Down/right = next section, Up/left = prev (natural direction mapping) */
    const invertVertical = false;
    const currentRouteIdx = routeIndex(location.pathname);
    const configSectionIds = LATERAL_ROUTES[currentRouteIdx]?.sectionIds ?? [];
    const sectionIds = useRouteSections(location.pathname, configSectionIds);

    const [baseChangeCounter, setBaseChangeCounter] = useState(0);
    const prevPathnameRef = useRef(location.pathname);

    const currentVerticalRef =
        verticalRefs.current.get(currentRouteIdx) ?? null;

    const depthParam = (() => {
        const d = new URLSearchParams(location.search).get("depth");
        const n = d ? parseInt(d, 10) : NaN;
        return Number.isFinite(n) && n >= 1 ? n : null;
    })();

    const updateDepthParam = useCallback(
        (depth: number) => {
            const params = new URLSearchParams(location.search);
            if (depth <= 1) {
                params.delete("depth");
            } else {
                params.set("depth", String(depth));
            }
            const search = params.toString();
            const newSearch = search ? `?${search}` : "";
            const currentSearch = location.search || "";
            if (currentSearch !== newSearch) {
                history.replace({
                    pathname: location.pathname,
                    search: newSearch,
                });
            }
        },
        [history, location.pathname, location.search]
    );

    const scrollPanelToTopInstant = useCallback((el: HTMLDivElement) => {
        const mobileCards = el.querySelector(".mobile-cards");
        const scrollEl = (mobileCards || el) as HTMLElement;
        document.body.classList.add("scroll-to-top-active");
        scrollEl.scrollTop = 0;
        el.scrollTop = 0;
        setTimeout(() => {
            document.body.classList.remove("scroll-to-top-active");
        }, 150);
    }, []);

    // On route enter: scroll to depth param if explicit, otherwise scroll to top
    useLayoutEffect(() => {
        const el = currentVerticalRef;
        if (!el || sectionIds.length === 0) return;

        if (depthParam != null) {
            const targetIndex = Math.min(depthParam - 1, sectionIds.length - 1);
            if (targetIndex >= 0) {
                const sections = sectionIds
                    .map((id) => el.querySelector(`#${id}`))
                    .filter((s): s is HTMLElement => s !== null);
                const section = sections[targetIndex];
                if (section) {
                    section.scrollIntoView({
                        behavior: "auto",
                        block: "start",
                    });
                }
                return;
            }
        }

        scrollPanelToTopInstant(el);
    }, [
        location.pathname,
        depthParam,
        currentVerticalRef,
        sectionIds,
        scrollPanelToTopInstant,
    ]);

    // Update URL depth param when user scrolls vertically
    useEffect(() => {
        const el = currentVerticalRef;
        if (!el || sectionIds.length === 0) return;
        const scrollEl = (isMobile && el.querySelector(".mobile-cards")) || el;

        const syncDepthToUrl = () => {
            const sections = sectionIds
                .map((id) => el.querySelector(`#${id}`))
                .filter((s): s is HTMLElement => s !== null);
            if (sections.length === 0) return;
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
            updateDepthParam(index + 1);
        };

        syncDepthToUrl();
        scrollEl.addEventListener("scroll", syncDepthToUrl);
        window.addEventListener("resize", syncDepthToUrl);
        return () => {
            scrollEl.removeEventListener("scroll", syncDepthToUrl);
            window.removeEventListener("resize", syncDepthToUrl);
        };
    }, [currentVerticalRef, sectionIds, isMobile, updateDepthParam]);

    // Base change = new playthrough: invalidate orb cache and bump counter so panels regenerate
    useEffect(() => {
        if (prevPathnameRef.current !== location.pathname) {
            prevPathnameRef.current = location.pathname;
            invalidateRoomCache(location.pathname);
            setBaseChangeCounter((c) => c + 1);
        }
    }, [location.pathname]);

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

    /** Single navigation handler – used by keyboard, wheel, and touch */
    type NavDir = "up" | "down" | "left" | "right";
    const navigate = useCallback(
        (dir: NavDir) => {
            if (dir === "left" || dir === "right") {
                goRoute(dir === "left" ? -1 : 1);
            } else {
                goSection(dir === "down" ? 1 : -1);
            }
        },
        [goRoute, goSection]
    );

    const scrollToTop = useCallback(() => {
        const el = verticalRefs.current.get(currentRouteIdx);
        if (!el) return;
        scrollPanelToTopInstant(el);
    }, [currentRouteIdx, scrollPanelToTopInstant]);

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
            if ((e.ctrlKey || e.metaKey) && e.key === "ArrowUp") {
                e.preventDefault();
                scrollToTop();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                navigate("left");
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                navigate("right");
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                navigate("up");
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                navigate("down");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, scrollToTop]);

    useEffect(() => {
        const THRESHOLD = 120;
        const LOCKOUT_MS = 700;
        const IDLE_RESET_MS = 150;

        const onWheel = (e: WheelEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }
            const now = Date.now();
            if (now < wheelLockoutUntil.current) {
                e.preventDefault();
                return;
            }
            if (now - lastWheelTime.current > IDLE_RESET_MS) {
                wheelAccum.current = { x: 0, y: 0 };
            }
            lastWheelTime.current = now;

            const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 80 : 1;
            const dx = e.deltaX * scale;
            const dy = e.deltaY * scale;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            const isHorizontal = absX > absY;
            const delta = isHorizontal ? dx : dy;
            const sign = delta > 0 ? 1 : -1;
            const axis = isHorizontal ? "x" : "y";

            e.preventDefault();
            if (wheelAccum.current[axis] > 0 !== sign > 0)
                wheelAccum.current[axis] = 0;
            wheelAccum.current[axis] += delta;

            if (Math.abs(wheelAccum.current[axis]) >= THRESHOLD) {
                wheelAccum.current[axis] = 0;
                wheelLockoutUntil.current = now + LOCKOUT_MS;
                navigate(
                    isHorizontal
                        ? sign > 0
                            ? "right"
                            : "left"
                        : sign > 0
                        ? "down"
                        : "up"
                );
            }
        };
        window.addEventListener("wheel", onWheel, { passive: false });
        return () => window.removeEventListener("wheel", onWheel);
    }, [navigate]);

    useEffect(() => {
        const el = lateralRef.current;
        if (!el) return;
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
        };
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        return () => el.removeEventListener("touchmove", onTouchMove);
    }, []);

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

        if (absDx > absDy && absDx > threshold) {
            navigate(dx > 0 ? "left" : "right");
            return;
        }
        if (absDy > absDx && absDy > threshold && sectionIds.length > 0) {
            navigate(dy < 0 ? "up" : "down");
        }
    };

    const setVerticalRef = useCallback(
        (idx: number, el: HTMLDivElement | null) => {
            if (el) verticalRefs.current.set(idx, el);
        },
        []
    );

    return (
        <RespawnProvider scrollToTop={scrollToTop}>
            <div className="app app-navigator">
                <Navbar />
                <div className="app-control-panel">
                    <ScrollToTopButton sectionIds={sectionIds} />
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
                            key={
                                route.path === location.pathname
                                    ? `${route.path}-${baseChangeCounter}`
                                    : route.path
                            }
                            className="route-panel"
                            ref={(el) => setVerticalRef(idx, el)}
                        >
                            {PANELS[route.path]?.() ?? null}
                        </div>
                    ))}
                </div>
            </div>
        </RespawnProvider>
    );
}
