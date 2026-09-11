import { useEffect, useState } from 'react'

function pad(n) {
  return String(n).padStart(2, '0')
}

function msToNextMidnight() {
  const now = new Date()
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
  return Math.max(0, mid.getTime() - now.getTime())
}

function parts(ms) {
  const total = Math.floor(ms / 1000)
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    text: `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`,
  }
}

export default function Countdown({ label = 'Resets' }) {
  const [now, setNow] = useState(() => msToNextMidnight())

  useEffect(() => {
    const id = setInterval(() => setNow(msToNextMidnight()), 1000)
    return () => clearInterval(id)
  }, [])

  const p = parts(now)

  return (
    <span
      className="countdown"
      role="timer"
      aria-live="polite"
      aria-label={`${label} in ${p.h} hours, ${p.m} minutes, ${p.s} seconds`}
    >
      <span className="countdown-label">{label} in</span>
      <span className="countdown-time">{p.text}</span>
    </span>
  )
}