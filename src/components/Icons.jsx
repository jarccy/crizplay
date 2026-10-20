// Iconos de trazo (estilo Lucide) como componentes ligeros
const icon = (paths, filled = false) =>
  function Icon({ className = 'size-5', fill, ...props }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill={filled || fill ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    )
  }

export const PlayIcon = icon(<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />, true)
export const PauseIcon = icon(
  <>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </>,
  true,
)
export const PrevIcon = icon(
  <>
    <path d="M19 20 9 12l10-8v16Z" fill="currentColor" />
    <path d="M5 19V5" />
  </>,
)
export const NextIcon = icon(
  <>
    <path d="m5 4 10 8-10 8V4Z" fill="currentColor" />
    <path d="M19 5v14" />
  </>,
)
export const ShuffleIcon = icon(
  <>
    <path d="m18 14 4 4-4 4" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
    <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
    <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
  </>,
)
const repeatPaths = (
  <>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </>
)
export const RepeatIcon = icon(repeatPaths)
export const RepeatOneIcon = icon(
  <>
    {repeatPaths}
    <path d="M11 10h1v4" />
  </>,
)
export const VolumeIcon = icon(
  <>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </>,
)
export const MuteIcon = icon(
  <>
    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <path d="m22 9-6 6" />
    <path d="m16 9 6 6" />
  </>,
)
export const HeartIcon = icon(
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
)
export const PlusIcon = icon(
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>,
)
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
)
export const PaletteIcon = icon(
  <>
    <circle cx="13.5" cy="6.5" r="1" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </>,
)
export const TrashIcon = icon(
  <>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </>,
)
export const MusicIcon = icon(
  <>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </>,
)
export const LibraryIcon = icon(
  <>
    <path d="m16 6 4 14" />
    <path d="M12 6v14" />
    <path d="M8 8v12" />
    <path d="M4 4v16" />
  </>,
)
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />)
export const DownloadIcon = icon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </>,
)
export const XIcon = icon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
)
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />)
export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>,
)
export const MoonIcon = icon(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />)
export const MonitorIcon = icon(
  <>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>,
)
export const PlaylistIcon = icon(
  <>
    <path d="M21 15V6" />
    <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path d="M12 12H3" />
    <path d="M16 6H3" />
    <path d="M12 18H3" />
  </>,
)
export const ListPlusIcon = icon(
  <>
    <path d="M11 12H3" />
    <path d="M16 6H3" />
    <path d="M16 18H3" />
    <path d="M18 9v6" />
    <path d="M21 12h-6" />
  </>,
)
export const PencilIcon = icon(
  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />,
)
export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />)
export const MinusCircleIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
  </>,
)
export const MoreIcon = icon(
  <>
    <circle cx="12" cy="5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
  </>,
)
export const ShareIcon = icon(
  <>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <path d="m16 6-4-4-4 4" />
    <path d="M12 2v13" />
  </>,
)
export const LyricsIcon = icon(
  <>
    <path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12" />
    <path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5" />
    <circle cx="16" cy="7" r="5" />
  </>,
)
export const ClipboardIcon = icon(
  <>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </>,
)
export const SortIcon = icon(
  <>
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="M11 4h10" />
    <path d="M11 8h7" />
    <path d="M11 12h4" />
  </>,
)
