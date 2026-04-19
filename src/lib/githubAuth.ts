/** GitHub OAuth entry (redirects to github.com). */
export const GH_LOGIN_URL = "/api/gh/login";

export async function fetchGithubSession(): Promise<
    | { authenticated: false }
    | { authenticated: true; login: string; id: number }
> {
    try {
        const res = await fetch("/api/gh/session", { credentials: "include" });
        if (!res.ok) {
            return { authenticated: false };
        }
        const data = (await res.json()) as {
            authenticated?: boolean;
            login?: string;
            id?: number;
        };
        if (
            !data.authenticated ||
            typeof data.login !== "string" ||
            typeof data.id !== "number"
        ) {
            return { authenticated: false };
        }
        return {
            authenticated: true,
            login: data.login,
            id: data.id,
        };
    } catch {
        return { authenticated: false };
    }
}
