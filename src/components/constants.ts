// Website Domain
export const WEBSITE_DOMAIN = process.env.REACT_APP_WEBSITE_DOMAIN || "vex.wtf";

// API Endpoints
export const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://api.vex.wtf";

// API Endpoints
export const API_ENDPOINTS = {
    INVITE: (inviteId: string) => `${API_BASE_URL}/invite/${inviteId}`,
    USER: (userId: string) => `${API_BASE_URL}/user/${userId}`,
    SERVER: (serverId: string) => `${API_BASE_URL}/server/${serverId}`,
    AVATAR: (userId: string) => `${API_BASE_URL}/avatar/${userId}`,
};

// GitHub API Endpoints
export const GITHUB_API_BASE = "https://api.github.com";
export const GITHUB_REPOS = {
    VEX_DESKTOP: "vex-chat/vex-desktop",
    PRIVACY_POLICY: "vex-chat/privacy-policy",
};

export const GITHUB_ENDPOINTS = {
    RELEASES: (repo: string) => `${GITHUB_API_BASE}/repos/${repo}/releases`,
    COMMITS: (repo: string, branch: string = "main") =>
        `${GITHUB_API_BASE}/repos/${repo}/commits/${branch}`,
    COMMIT_HISTORY: (repo: string, sha: string, perPage: number = 10) =>
        `${GITHUB_API_BASE}/repos/${repo}/commits?per_page=${perPage}&sha=${sha}`,
};

// GitHub Raw Content
export const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";
export const GITHUB_RAW_URLS = {
    PRIVACY_POLICY: `${GITHUB_RAW_BASE}/vex-chat/privacy-policy/main/PrivacyPolicy.md`,
};

// GitHub Web URLs
export const GITHUB_WEB_BASE = "https://github.com";
export const GITHUB_WEB_URLS = {
    VEX_DESKTOP: `${GITHUB_WEB_BASE}/vex-chat/vex-desktop`,
    VEX_DESKTOP_RELEASES: `${GITHUB_WEB_BASE}/vex-chat/vex-desktop/releases`,
    VEX_CHAT_ORG: `${GITHUB_WEB_BASE}/vex-chat`,
    PRIVACY_POLICY_COMMITS: `${GITHUB_WEB_BASE}/vex-chat/privacy-policy/commits/main`,
};

// Feature flags
export const DOWNLOAD_ENABLED =
    process.env.REACT_APP_DOWNLOAD_ENABLED === "true";

// Brand: text rendered next to the square logo (navbar)
export const LOGO_TEXT = "Vex Heavy Industries";

// Hero card tagline (logo + this text)
export const HERO_CARD_TAGLINE = "Private Chat For Sensitive Young Men";

// Social
export const TWITTER_HANDLE = "vexwtf7";
export const TWITTER_URL = `https://x.com/${TWITTER_HANDLE}`;
export const CEO_TWITTER_HANDLE = "yuki111888";
export const CEO_TWITTER_URL = `https://x.com/${CEO_TWITTER_HANDLE}`;

// Other constants
export const DIVISOR = 10;
