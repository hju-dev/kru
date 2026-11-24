import { useNavigate } from 'react-router'

/** Back goes back exactly one screen (Henry, Nov 24); with nothing to go back to, it goes to `fallback`. */
export function BackButton({ fallback = '/', label = '◀ Back', className = 'btn small' }: { fallback?: string; label?: string; className?: string }) {
  const navigate = useNavigate()
  return (
    <button
      className={className}
      aria-label="Back"
      onClick={() => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (idx > 0) navigate(-1)
        else navigate(fallback, { replace: true })
      }}
    >
      {label}
    </button>
  )
}
