import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
    LATERAL_ROUTES,
    routeIndex,
    pathForIndex,
} from "../navigation/routeConfig";
import { useRespawn } from "../context/RespawnContext";

const ROUTE_LABELS: Record<string, string> = {
    "/": "Home",
    "/download": "Download",
    "/privacy-policy": "Privacy Policy",
};

export function LateralRouteMenu(): JSX.Element {
    const history = useHistory();
    const location = useLocation();
    const { scrollToTop } = useRespawn();
    const currentIdx = routeIndex(location.pathname);

    const goTo = (i: number) => {
        const isSameRoute = i === currentIdx;
        if (isSameRoute) {
            scrollToTop();
        } else {
            history.push({
                pathname: pathForIndex(i),
                search: "?depth=1",
            });
        }
    };

    return (
        <nav
            className="lateral-route-menu"
            role="tablist"
            aria-label="Page navigation"
        >
            {LATERAL_ROUTES.map((route, i) => (
                <button
                    key={route.path}
                    type="button"
                    role="tab"
                    aria-selected={i === currentIdx}
                    aria-label={`Go to ${
                        ROUTE_LABELS[route.path] ?? route.path
                    }`}
                    className={`lateral-route-menu__item ${
                        i === currentIdx
                            ? "lateral-route-menu__item--active"
                            : ""
                    }`}
                    onClick={() => goTo(i)}
                >
                    {ROUTE_LABELS[route.path] ?? route.path}
                </button>
            ))}
        </nav>
    );
}
