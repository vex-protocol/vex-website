import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
    LATERAL_ROUTES,
    routeIndex,
    pathForIndex,
} from "../navigation/routeConfig";

/** Lateral route indicator – shows which page (Home, Download, Privacy) */
export function RouteIndicator(): JSX.Element {
    const history = useHistory();
    const location = useLocation();
    const currentIdx = routeIndex(location.pathname);

    return (
        <div
            className="route-indicator"
            role="tablist"
            aria-label="Route navigation"
        >
            {LATERAL_ROUTES.map((route, i) => (
                <button
                    key={route.path}
                    type="button"
                    role="tab"
                    aria-selected={i === currentIdx}
                    aria-label={`Go to ${
                        route.path === "/" ? "home" : route.path.slice(1)
                    }`}
                    className={`route-indicator__dot ${
                        i === currentIdx ? "route-indicator__dot--active" : ""
                    }`}
                    onClick={() => history.push(pathForIndex(i))}
                />
            ))}
        </div>
    );
}
