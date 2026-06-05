/**
 * Shared SVG icon set — Lucide-style, 24×24 viewBox, stroke-based.
 * All icons use currentColor so they inherit text color from parent.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Icon({ children, className = 'w-5 h-5', ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function BotIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
      <rect x="5" y="8" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 8V6a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9.5" cy="14" r="1.5" fill="currentColor" />
      <circle cx="14.5" cy="14" r="1.5" fill="currentColor" />
      <path d="M9.5 17.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M5 13l4 4L19 7" />
    </Icon>
  );
}

export function ArrowRightIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Icon>
  );
}

export function ArrowLeftIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Icon>
  );
}

export function FileTextIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </Icon>
  );
}

export function PaperclipIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </Icon>
  );
}

export function UploadIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </Icon>
  );
}

export function CheckCircleIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </Icon>
  );
}

export function XCircleIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </Icon>
  );
}

export function RefreshIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </Icon>
  );
}

export function DownloadIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </Icon>
  );
}

export function EyeIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function AlertTriangleIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </Icon>
  );
}

export function TerminalIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M4 17l6-6-6-6M12 19h8" />
    </Icon>
  );
}

export function SpinnerIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export function LogOutIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </Icon>
  );
}

export function ShieldIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  );
}

export function TrashIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </Icon>
  );
}

export function ChevronDownIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function SearchIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </Icon>
  );
}

export function LockIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </Icon>
  );
}

export function UserIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  );
}

export function UsersIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Icon>
  );
}

export function KeyIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </Icon>
  );
}

export function PlusIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function FolderOpenIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </Icon>
  );
}

export function UploadCloudIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </Icon>
  );
}

export function ClipboardListIcon({ className = 'w-5 h-5', ...rest }: IconProps) {
  return (
    <Icon className={className} {...rest}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 12h6M9 16h4" />
    </Icon>
  );
}
