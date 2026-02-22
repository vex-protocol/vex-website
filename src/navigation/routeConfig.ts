import { DOWNLOAD_ENABLED } from "../components/constants";

export interface RouteDef {
    path: string;
    sectionIds: readonly string[];
}

/** Lateral order (left→right): Home, Contact, Download, Privacy (last) */
export const LATERAL_ROUTES: RouteDef[] = [
    { path: "/", sectionIds: ["hero", "about", "features"] },
    { path: "/contact", sectionIds: ["contact"] },
    ...(DOWNLOAD_ENABLED
        ? [
              {
                  path: "/download",
                  sectionIds: ["download-hero", "download-releases"],
              },
          ]
        : []),
    {
        path: "/privacy-policy",
        sectionIds: [
            "privacy-header",
            "privacy-intro",
            "privacy-why-you-should-care",
            "privacy-what-is-collected",
            "privacy-what-isnt-collected",
            "privacy-what-is-shared",
            "privacy-updates-and-more",
            "privacy-update-history",
        ],
    },
];

export function routeIndex(pathname: string): number {
    const i = LATERAL_ROUTES.findIndex((r) => r.path === pathname);
    return i >= 0 ? i : 0;
}

export function pathForIndex(index: number): string {
    return LATERAL_ROUTES[
        Math.max(0, Math.min(index, LATERAL_ROUTES.length - 1))
    ].path;
}
