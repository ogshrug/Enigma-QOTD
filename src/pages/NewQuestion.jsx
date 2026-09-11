import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { uploadToMediaBucket } from '../lib/upload'
import { todayStr } from './PlayerHome'

export default function NewQuestion() {
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [date, setDate] = useState(todayStr())
  const [parts, setParts] = useState([{ text: '', points: 1 }])
  const [explanation, setExplanation] = useState('')
  const [active, setActive] = useState(true)

  const [imageOn, setImageOn] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const [mediaKind, setMediaKind] = useState('none') // none | video | audio
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState('')

  const [hints, setHints] = useState([''])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImagePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setImagePreview('')
  }, [imageFile])

  useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile)
      setMediaPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setMediaPreview('')
  }, [mediaFile])

  function updateHint(i, value) {
    setHints((prev) => prev.map((h, idx) => (idx === i ? value : h)))
  }

  function updatePart(i, field, value) {
    setParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  const totalPoints = parts.reduce((sum, p) => sum + (Number(p.points) || 0), 0)

  async function handleSubmit(e) {
    e.preventDefault()
    const validParts = parts
      .map((p) => ({ text: p.text.trim(), points: Math.max(1, Number(p.points) || 1) }))
      .filter((p) => p.text)
    if (!text.trim() || !date || validParts.length === 0) return
    setBusy(true)
    setError('')
    try {
      const folder = `questions/${todayStr()}`
      let image_url = ''
      if (imageOn && imageFile) image_url = await uploadToMediaBucket(imageFile, folder)

      let media_type = 'none'
      let media_url = ''
      if (mediaKind !== 'none' && mediaFile) {
        media_type = mediaKind
        media_url = await uploadToMediaBucket(mediaFile, folder)
      }

      const { error } = await supabase.from('questions').insert({
        text: text.trim(),
        question_date: date,
        answer_parts: validParts,
        points: totalPoints || 1,
        hints: hints.map((h) => h.trim()).filter(Boolean),
        explanation: explanation.trim() || '',
        active,
        image_url,
        media_type,
        media_url,
      })
      if (error) throw error
      navigate('/admin')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-container-lowest)',
    color: 'var(--on-surface)',
    border: '1px solid var(--outline-strong)',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
  }
  const labelStyle = { display: 'block', margin: '12px 0 6px', fontWeight: 600, fontSize: 14 }

  return (
    <div className="card">
      <h2>New question</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="text" style={labelStyle}>
          Question
        </label>
        <textarea
          id="text"
          style={{ ...inputStyle, minHeight: 96 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "What does the scientific method emphasize?"'
          required
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <input
            id="imageOn"
            type="checkbox"
            checked={imageOn}
            onChange={(e) => setImageOn(e.target.checked)}
          />
          <label htmlFor="imageOn" style={{ margin: 0 }}>
            Add an image to this question
          </label>
        </div>

        {imageOn && (
          <div className="media-box">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {imagePreview && <img src={imagePreview} alt="Preview" />}
          </div>
        )}

        <label style={labelStyle}>Video or audio</label>
        <div style={{ display: 'flex', gap: 14 }}>
          {['none', 'video', 'audio'].map((k) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input
                type="radio"
                name="mediaKind"
                checked={mediaKind === k}
                onChange={() => setMediaKind(k)}
              />
              {k === 'none' ? 'None' : k === 'video' ? 'Video' : 'Audio'}
            </label>
          ))}
        </div>
        {mediaKind !== 'none' && (
          <div className="media-box">
            <input
              type="file"
              accept={mediaKind === 'video' ? 'video/*' : 'audio/*'}
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
            />
            {mediaPreview &&
              (mediaKind === 'video' ? (
                <video controls src={mediaPreview} />
              ) : (
                <audio controls src={mediaPreview} />
              ))}
          </div>
        )}

        <label style={labelStyle}>Hints (add as many as you like)</label>
        {hints.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, margin: '6px 0' }}>
            <input
              type="text"
              style={inputStyle}
              value={h}
              onChange={(e) => updateHint(i, e.target.value)}
              placeholder={`Hint ${i + 1}`}
            />
            <button
              type="button"
              className="btn ghost"
              onClick={() => setHints((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost"
          onClick={() => setHints((prev) => [...prev, ''])}
        >
          + Add hint
        </button>

        <label style={labelStyle}>Answer parts (each gives its own points)</label>
        {parts.map((part, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, margin: '6px 0', alignItems: 'center' }}>
            <input
              type="text"
              style={inputStyle}
              value={part.text}
              onChange={(e) => updatePart(i, 'text', e.target.value)}
              placeholder={`Accepted answer ${i + 1}`}
            />
            <input
              type="number"
              min={1}
              style={{ ...inputStyle, width: 90, flexShrink: 0 }}
              value={part.points}
              onChange={(e) => updatePart(i, 'points', e.target.value)}
              title="Points for this part"
            />
            <button
              type="button"
              className="btn ghost"
              style={{ flexShrink: 0 }}
              onClick={() => setParts((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost"
          onClick={() => setParts((prev) => [...prev, { text: '', points: 1 }])}
        >
          + Add answer part
        </button>
        <p className="muted" style={{ fontSize: 13 }}>
          Total points: <strong>{totalPoints || 1}</strong>. Full points are auto-awarded
          only when the answer covers every part; otherwise it's flagged for review.
        </p>

        <label htmlFor="explanation" style={labelStyle}>
          Explanation (shown after a correct answer)
        </label>
        <textarea
          id="explanation"
          style={{ ...inputStyle, minHeight: 72 }}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Optional — why this is the correct answer"
        />

        <label htmlFor="date" style={labelStyle}>
          Date (players will see it on this day)
        </label>
        <input
          id="date"
          type="date"
          style={inputStyle}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <div className="row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Live now
          </label>
        </div>

        <div className="row">
          <button className="btn" type="submit" disabled={busy || !text.trim() || parts.every((p) => !p.text.trim())}>
            {busy ? 'Saving…' : 'Save question'}
          </button>
          <button className="btn ghost" type="button" onClick={() => navigate('/admin')}>
            Cancel
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}