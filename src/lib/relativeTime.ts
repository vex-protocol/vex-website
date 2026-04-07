const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
    numeric: "always",
});

export function formatRelativeTime(value: string): string {
    const timestampMs = new Date(value).getTime();
    if (!Number.isFinite(timestampMs)) return "unknown";
    const diffSeconds = Math.round((timestampMs - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);
    if (absSeconds < 60) {
        return RELATIVE_TIME_FORMATTER.format(diffSeconds, "second");
    }
    const diffMinutes = Math.round(diffSeconds / 60);
    const absMinutes = Math.abs(diffMinutes);
    if (absMinutes < 60) {
        return RELATIVE_TIME_FORMATTER.format(diffMinutes, "minute");
    }
    const diffHours = Math.round(diffMinutes / 60);
    const absHours = Math.abs(diffHours);
    if (absHours < 24) {
        return RELATIVE_TIME_FORMATTER.format(diffHours, "hour");
    }
    const diffDays = Math.round(diffHours / 24);
    const absDays = Math.abs(diffDays);
    if (absDays < 7) {
        return RELATIVE_TIME_FORMATTER.format(diffDays, "day");
    }
    const diffWeeks = Math.round(diffDays / 7);
    const absWeeks = Math.abs(diffWeeks);
    if (absWeeks < 5) {
        return RELATIVE_TIME_FORMATTER.format(diffWeeks, "week");
    }
    const diffMonths = Math.round(diffDays / 30.4375);
    const absMonths = Math.abs(diffMonths);
    if (absMonths < 12) {
        return RELATIVE_TIME_FORMATTER.format(diffMonths, "month");
    }
    const diffYears = Math.round(diffDays / 365.25);
    return RELATIVE_TIME_FORMATTER.format(diffYears, "year");
}
