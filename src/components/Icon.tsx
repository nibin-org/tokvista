import React from 'react';

export type IconName =
    | 'foundation'
    | 'semantic'
    | 'components'
    | 'playground'
    | 'colors'
    | 'fill'
    | 'stroke'
    | 'text'
    | 'spacing'
    | 'sizes'
    | 'radius'
    | 'typography'
    | 'button'
    | 'input'
    | 'card'
    | 'modal'
    | 'dropdown'
    | 'checkbox'
    | 'radio'
    | 'toggle'
    | 'slider'
    | 'badge'
    | 'alert'
    | 'tooltip'
    | 'avatar'
    | 'sun'
    | 'moon'
    | 'lock'
    | 'copy'
    | 'default';

type IconProps = {
    name: IconName;
    size?: number;
    className?: string;
} & React.SVGProps<SVGSVGElement>;

const base = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

const ICONS: Record<IconName, (props: React.SVGProps<SVGSVGElement>) => JSX.Element> = {
    foundation: (props) => (
        <svg {...base} {...props}>
            <path d="M12 3l9 5-9 5-9-5 9-5z" />
            <path d="M3 12l9 5 9-5" />
            <path d="M3 17l9 5 9-5" />
        </svg>
    ),
    semantic: (props) => (
        <svg {...base} {...props}>
            <path d="M12 3a9 9 0 1 0 0 18c1.6 0 2.6-1.1 2.6-2.4 0-.8-.4-1.5-1.1-1.9a2.6 2.6 0 0 1 2.2-4.6h1.1A4.6 4.6 0 0 0 12 3z" />
            <circle cx="7.5" cy="9" r="1" />
            <circle cx="12" cy="7.2" r="1" />
            <circle cx="16.5" cy="9" r="1" />
        </svg>
    ),
    components: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="4" width="7" height="7" rx="1.5" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
    ),
    playground: (props) => (
        <svg {...base} {...props}>
            <rect x="4.5" y="9" width="15" height="8" rx="4" />
            <path d="M9 13h4" />
            <path d="M11 11v4" />
            <circle cx="15.5" cy="12.5" r="0.8" />
            <circle cx="17.5" cy="14.5" r="0.8" />
        </svg>
    ),
    colors: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <circle cx="9" cy="9" r="1.2" />
            <circle cx="15" cy="9" r="1.2" />
            <circle cx="12" cy="14" r="1.2" />
        </svg>
    ),
    fill: (props) => (
        <svg {...base} {...props}>
            <path d="M12 3c3 4 6 7 6 10a6 6 0 1 1-12 0c0-3 3-6 6-10z" />
        </svg>
    ),
    stroke: (props) => (
        <svg {...base} {...props}>
            <path d="M16.5 3.5l4 4-9.5 9.5-4.5 1 1-4.5 9.5-9.5z" />
            <path d="M12 20h8" />
        </svg>
    ),
    text: (props) => (
        <svg {...base} {...props}>
            <path d="M5 5h14" />
            <path d="M12 5v14" />
        </svg>
    ),
    spacing: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M8 10v4" />
            <path d="M12 10v2" />
            <path d="M16 10v4" />
        </svg>
    ),
    sizes: (props) => (
        <svg {...base} {...props}>
            <rect x="6" y="6" width="12" height="12" rx="2" />
            <path d="M4 12h4" />
            <path d="M16 12h4" />
            <path d="M12 4v4" />
            <path d="M12 16v4" />
        </svg>
    ),
    radius: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="4" width="16" height="16" rx="6" />
        </svg>
    ),
    typography: (props) => (
        <svg {...base} {...props}>
            <path d="M5 5h14" />
            <path d="M12 5v14" />
            <path d="M8 19h8" />
        </svg>
    ),
    button: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="8" width="16" height="8" rx="4" />
        </svg>
    ),
    input: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M8 10v4" />
        </svg>
    ),
    card: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M4 9h16" />
        </svg>
    ),
    modal: (props) => (
        <svg {...base} {...props}>
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M3 8h18" />
        </svg>
    ),
    dropdown: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 10h8" />
            <path d="M8 14h6" />
            <path d="M16 10l2 2-2 2" />
        </svg>
    ),
    checkbox: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8 12l3 3 5-6" />
        </svg>
    ),
    radio: (props) => (
        <svg {...base} {...props}>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    toggle: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="9" width="16" height="6" rx="3" />
            <circle cx="9" cy="12" r="2.2" />
        </svg>
    ),
    slider: (props) => (
        <svg {...base} {...props}>
            <path d="M4 8h16" />
            <circle cx="9" cy="8" r="2" />
            <path d="M4 16h16" />
            <circle cx="15" cy="16" r="2" />
        </svg>
    ),
    badge: (props) => (
        <svg {...base} {...props}>
            <path d="M7 5h7l5 5-7 7-5-5z" />
            <circle cx="15" cy="9" r="1" />
        </svg>
    ),
    alert: (props) => (
        <svg {...base} {...props}>
            <path d="M12 4l9 16H3l9-16z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    ),
    tooltip: (props) => (
        <svg {...base} {...props}>
            <rect x="4" y="5" width="16" height="12" rx="3" />
            <path d="M8 17l-2 3 4-3" />
        </svg>
    ),
    avatar: (props) => (
        <svg {...base} {...props}>
            <circle cx="12" cy="9" r="3" />
            <path d="M5 20c1.6-3.5 12.4-3.5 14 0" />
        </svg>
    ),
    sun: (props) => (
        <svg {...base} {...props}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4 12H2" />
            <path d="M22 12h-2" />
            <path d="M5 5l-1.5-1.5" />
            <path d="M20.5 20.5L19 19" />
            <path d="M5 19l-1.5 1.5" />
            <path d="M20.5 3.5L19 5" />
        </svg>
    ),
    moon: (props) => (
        <svg {...base} {...props}>
            <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4a6 6 0 0 0 10.5 10.5z" />
        </svg>
    ),
    lock: (props) => (
        <svg {...base} {...props}>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
        </svg>
    ),
    copy: (props) => (
        <svg {...base} {...props}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    default: (props) => (
        <svg {...base} {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8" />
        </svg>
    ),
};

export function Icon({ name, size = 18, className, ...rest }: IconProps) {
    const Comp = ICONS[name] || ICONS.default;
    return (
        <Comp
            width={size}
            height={size}
            className={['ftd-icon', className].filter(Boolean).join(' ')}
            aria-hidden="true"
            focusable="false"
            {...rest}
        />
    );
}

