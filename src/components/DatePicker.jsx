import { useEffect, useRef, useState } from 'react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseValue(value) {
  if (!value) return null
  const [y, m, d] = String(value).split('-').map((n) => Number(n))
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function display(value) {
  const date = parseValue(value)
  if (!date) return 'Pick a date'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DatePicker({ value, onChange, id }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parseValue(value) ?? new Date())
  const wrapRef = useRef(null)

  useEffect(() => {
    function onPointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const selected = parseValue(value)
  const today = new Date()

  function shift(m, delta) {
    setView(new Date(m, view.getMonth() + delta, 1))
  }

  function choose(d) {
    onChange(toISO(d))
    setOpen(false)
  }

  const firstWeekday = new Date(view.getFullYear(), view.getMonth(), 1).getDay()
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const sameDay = (a, b) =>
    a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  return (
    <div className={`dp-wrap${open ? ' open' : ''}`} ref={wrapRef}>
      <button
        id={id}
        type="button"
        className="dp-field"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{display(value)}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="dp-caret" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="dp-pop">
          <div className="dp-head">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift('prev', -1)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <strong>
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shift('next', 1)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="dp-grid">
            {DAYS.map((d) => (
              <span key={d} className="dp-dow">{d}</span>
            ))}
            {cells.map((day, i) =>
              day === null ? (
                <span key={`x${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  className={[
                    'dp-day',
                    sameDay(selected, new Date(view.getFullYear(), view.getMonth(), day)) ? 'selected' : '',
                    sameDay(today, new Date(view.getFullYear(), view.getMonth(), day)) ? 'today' : '',
                  ].join(' ')}
                  onClick={() => choose(new Date(view.getFullYear(), view.getMonth(), day))}
                >
                  {day}
                </button>
              )
            )}
          </div>

          <div className="dp-foot">
            <button type="button" onClick={() => choose(today)}>Today</button>
          </div>
        </div>
      )}
    </div>
  )
}