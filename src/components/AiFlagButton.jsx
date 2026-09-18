import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

const FlagIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="M4 22V4" />
    <path d="M4 4h14l-2.5 3.5L18 11H4" />
  </svg>
)

// Secret admin-only control: flags an answer as suspected AI. Players never see
// it — the data lives in ai_flags (admin-only RLS, fully hidden from players).
export default function AiFlagButton({ answerId, flag, onChanged }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(flag?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggleFlag(save) {
    setSaving(true)
    setError('')
    if (save) {
      const { error } = await supabase
        .from('ai_flags')
        .insert({
          answer_id: answerId,
          flagged_by: user?.id,
          note: note.trim(),
        })
      if (error) setError(error.message)
      else {
        setOpen(false)
        await onChanged()
      }
    } else {
      const { error } = await supabase
        .from('ai_flags')
        .delete()
        .eq('answer_id', answerId)
      if (error) setError(error.message)
      else await onChanged()
    }
    setSaving(false)
  }

  async function saveNote() {
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('ai_flags')
      .update({ note: note.trim() })
      .eq('answer_id', answerId)
    if (error) setError(error.message)
    setSaving(false)
  }

  if (flag) {
    return (
      <span className="ai-flag-box">
        <span className="pill bad ai-flag-pill">
          {FlagIcon} AI
        </span>
        <input
          type="text"
          className="ai-flag-note"
          value={note}
          maxLength={120}
          placeholder="Private note (admin only)"
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          disabled={saving}
        />
        <button
          type="button"
          className="btn ghost sm"
          disabled={saving}
          onClick={() => toggleFlag(false)}
          title="Remove the AI flag"
        >
          Unflag
        </button>
        {error && <span className="muted" style={{ fontSize: 12 }}>{error}</span>}
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn ghost sm ai-flag-btn"
        onClick={() => setOpen(true)}
        title="Flag this answer as suspected AI (admins only)"
      >
        {FlagIcon} Flag AI
      </button>
    )
  }

  return (
    <span className="ai-flag-box">
      <input
        type="text"
        className="ai-flag-note"
        value={note}
        maxLength={120}
        placeholder="Optional private note, then confirm"
        onChange={(e) => setNote(e.target.value)}
        autoFocus
        disabled={saving}
      />
      <button
        type="button"
        className="btn bad sm"
        disabled={saving}
        onClick={() => toggleFlag(true)}
      >
        Confirm flag
      </button>
      <button
        type="button"
        className="btn ghost sm"
        disabled={saving}
        onClick={() => {
          setOpen(false)
          setNote(flag?.note ?? '')
        }}
      >
        Cancel
      </button>
      {error && <span className="muted" style={{ fontSize: 12 }}>{error}</span>}
    </span>
  )
}