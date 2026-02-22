import React from "react";
import type { CardWithColor } from "../assets/proceduralImages";

type ThemedButtonProps = React.ComponentProps<"button"> & {
    accent: CardWithColor;
    variant?: "filled" | "outlined";
    size?: "small" | "medium" | "large";
};

/** Renders a button themed to a procedural accent color. Use inside or outside content-frame--procedural. */
export function ThemedButton({
    accent,
    variant = "filled",
    size = "medium",
    className = "",
    style,
    children,
    ...props
}: ThemedButtonProps): JSX.Element {
    const classes = [
        "button",
        "is-primary",
        variant === "outlined" ? "is-outlined" : "",
        size === "small" ? "is-small" : size === "large" ? "is-large" : "is-medium",
        "themed-button",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <span
            className="themed-button-wrapper"
            style={
                {
                    "--card-accent-color": accent.color,
                    "--card-accent-bg": accent.colorBg,
                    "--card-accent-glow": accent.color + "60",
                    "--card-accent-glow-strong": accent.color + "99",
                    ...style,
                } as React.CSSProperties
            }
        >
            <button
                type="button"
                className={`${classes} ${className}`.trim()}
                {...props}
            >
                {children}
            </button>
        </span>
    );
}
