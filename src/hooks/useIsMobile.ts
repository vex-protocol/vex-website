import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(
        () =>
            typeof window !== "undefined" &&
            window.innerWidth <= MOBILE_BREAKPOINT
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const handler = () => setIsMobile(mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return isMobile;
}
