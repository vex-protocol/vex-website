import type { JSX } from "preact";

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

function BaseIcon(props: IconProps): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        />
    );
}

export function BookOpenIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <path d="M12 7v14" />
            <path d="M3 18a2 2 0 0 1 2-2h7" />
            <path d="M3 6a2 2 0 0 1 2-2h7v16H5a2 2 0 0 1-2-2Z" />
            <path d="M21 18a2 2 0 0 0-2-2h-7" />
            <path d="M21 6a2 2 0 0 0-2-2h-7v16h7a2 2 0 0 0 2-2Z" />
        </BaseIcon>
    );
}

export function CheckIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <path d="m20 6-11 11-5-5" />
        </BaseIcon>
    );
}

export function CheckCircle2Icon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </BaseIcon>
    );
}

export function CopyIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </BaseIcon>
    );
}

export function GithubIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </BaseIcon>
    );
}

export function LoaderCircleIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        </BaseIcon>
    );
}

export function TwitterIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <path d="M22 5.8a8.5 8.5 0 0 1-2.44.67A4.25 4.25 0 0 0 21.43 4a8.48 8.48 0 0 1-2.69 1.03 4.24 4.24 0 0 0-7.22 3.86A12.03 12.03 0 0 1 3 4.8a4.24 4.24 0 0 0 1.31 5.66 4.2 4.2 0 0 1-1.92-.53v.06a4.25 4.25 0 0 0 3.4 4.16 4.27 4.27 0 0 1-1.92.07 4.25 4.25 0 0 0 3.97 2.95A8.52 8.52 0 0 1 2 18.93 12.02 12.02 0 0 0 8.5 20.8c7.8 0 12.07-6.46 12.07-12.06 0-.18 0-.36-.01-.54A8.62 8.62 0 0 0 22 5.8Z" />
        </BaseIcon>
    );
}

export function XCircleIcon(props: IconProps): JSX.Element {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </BaseIcon>
    );
}
