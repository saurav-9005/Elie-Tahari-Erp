import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 450 40"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-auto text-foreground', className)}
      fill="currentColor"
    >
      <title>Elie Tahari</title>
      <g>
        {/* E */}
        <rect x="0" y="0" width="30" height="8" />
        <rect x="0" y="16" width="24" height="8" />
        <rect x="0" y="32" width="30" height="8" />
        <rect x="0" y="0" width="8" height="12" />
        <rect x="0" y="20" width="8" height="20" />
        {/* L */}
        <rect x="40" y="0" width="8" height="40" />
        <rect x="40" y="32" width="30" height="8" />
        {/* I */}
        <rect x="80" y="0" width="8" height="40" />
        {/* E */}
        <rect x="98" y="0" width="30" height="8" />
        <rect x="98" y="16" width="24" height="8" />
        <rect x="98" y="32" width="30" height="8" />
        <rect x="98" y="0" width="8" height="12" />
        <rect x="98" y="20" width="8" height="20" />
      </g>
      <g transform="translate(158, 0)">
        {/* T */}
        <rect x="0" y="0" width="38" height="8" />
        <rect x="15" y="0" width="8" height="40" />
        {/* A */}
        <path d="M48 40 L67 0 L86 40 H78 L74 28 H60 L56 40 H48 Z M62 20 H72 L67 8 L62 20 Z" />
        {/* H */}
        <rect x="96" y="0" width="8" height="40" />
        <rect x="118" y="0" width="8" height="40" />
        <rect x="96" y="16" width="30" height="8" />
        {/* A */}
        <path d="M138 40 L157 0 L176 40 H168 L164 28 H150 L146 40 H138 Z M152 20 H162 L157 8 L152 20 Z" />
        {/* R */}
        <path d="M186,0 h8 v14 h10 c6,0,10,-4,10,-10 c0,-6,-4,-10,-10,-10 h-10 v-8 h-8 v40 h8 v-10 l16,18 h10 l-18,-20 c8,-2,12,-8,12,-16 c0,-10,-8,-18,-20,-18 h-18 Z"/>

        {/* I */}
        <rect x="234" y="0" width="8" height="40" />
      </g>
    </svg>
  );
}
