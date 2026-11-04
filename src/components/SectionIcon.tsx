import type { SectionId } from '../lib/games'

/** Simple line icons for the library sections (drawn, not emoji). */
export function SectionIcon({ id }: { id: SectionId }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (id) {
    case 'quizzes': // question mark in a circle
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 4" />
          <circle cx="12" cy="17.4" r="0.6" fill="currentColor" />
        </svg>
      )
    case 'reading': // open book
      return (
        <svg {...common}>
          <path d="M3 5.5c3-1.3 6-1.3 9 .5 3-1.8 6-1.8 9-.5v13c-3-1.3-6-1.3-9 .5-3-1.8-6-1.8-9-.5z" />
          <path d="M12 6v13.5" />
        </svg>
      )
    case 'speaking': // speech bubble
      return (
        <svg {...common}>
          <path d="M4 5h16v11H10l-5 4v-4H4z" />
          <path d="M8 9.5h8M8 12.5h5" />
        </svg>
      )
    case 'writing': // pencil
      return (
        <svg {...common}>
          <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" />
          <path d="M13.5 7l3 3" />
        </svg>
      )
    case 'tools': // wrench
      return (
        <svg {...common}>
          <path d="M14.5 6.5a4 4 0 0 1 5-1.6l-2.6 2.6 1.6 1.6 2.6-2.6a4 4 0 0 1-5.3 5L8 19.3a1.9 1.9 0 0 1-2.7-2.7L13 9a4 4 0 0 1 1.5-2.5z" />
        </svg>
      )
  }
}
