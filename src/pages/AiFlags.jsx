import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { SkeletonCard } from '../components/Skeleton'
import RichText from '../components/RichText'

function fmtWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AiFlags() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notReady, setNotReady] = useState('')
  const [busyId, setBusyId] = useState('')

  async function fetchFlags() {
    const { data, error } = await supabase
      .from('ai_flags')
      .select(`
        id, note, created_at, flagged_by,
        answers!ai_flags_answer_id_fkey(
          answer_text, created_at,
          questions!answers_question_id_fkey(text),
          profiles!answers_profile_id_fkey(name, class_section, email)
        ),
        flagger:profiles!ai_flags_flagged_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false })
    if (error) {
      if (/PGRST202|Could not find the function|relation \".*\" does not exist/i.test(error.message))
        setNotReady('AI flag tracker not set up yet — the SQL script has to be re-run in Supabase first.')
      else setError(error.message)
      return
    }
    setFlags(data ?? [])
    setError('')
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      await fetchFlags()
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function unflag(id) {
    if (!window.confirm('Remove this AI flag? (The answer and its points are untouched.)')) return
    setBusyId(id)
    setError('')
    const { error } = await supabase.from('ai_flags').delete().eq('id', id)
    if (error) setError(error.message)
    await fetchFlags()
    setBusyId('')
  }

  if (loading)
    return (
      <div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  if (notReady) return <p className="error">{notReady}</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <div className="card" style={{ padding: 14 }}>
        <div className="row between" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>AI flags</h2>
          <span className={`pill ${flags.length > 0 ? 'bad' : 'neutral'}`}>
            {flags.length} flagged
          </span>
        </div>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
          Secret admin tracker — players can never see any of this.
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="card center">
          <p className="muted">No AI-flagged answers yet. Flag them from the Grade screen.</p>
        </div>
      ) : (
        <ul className="plain">
          {flags.map((f) => {
            const a = f.answers
            const p = a?.profiles
            return (
              <li key={f.id} className="grade-item">
                <div className="row between" style={{ margin: 0 }}>
                  <div>
                    <strong>{p?.name || 'Unknown player'}</strong>
                    {p?.class_section ? <span className="pill neutral" style={{ marginLeft: 8 }}>{p.class_section}</span> : null}
                  </div>
                  <span className="aw-when muted mono">{fmtWhen(f.created_at)}</span>
                </div>
                <p style={{ margin: '6px 0 2px' }}>
                  <strong><RichText text={a?.questions?.text ?? 'Unknown question'} /></strong>
                </p>
                <p className="muted" style={{ margin: '0 0 8px' }}>{a?.answer_text}</p>
                {f.note ? (
                  <p className="flag-note"><strong>Note:</strong> {f.note}</p>
                ) : (
                  <p className="muted subtle">No note added.</p>
                )}
                <div className="row between" style={{ marginBottom: 0 }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Flagged by {f.flagger?.name || 'an admin'}
                  </span>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={busyId === f.id}
                    onClick={() => unflag(f.id)}
                  >
                    Unflag
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}