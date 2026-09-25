import { MULTI_DELIM, partLabel, splitAnswerText } from '../lib/answerParts'

// Renders a stored answer_text. Multi-box answers are split into labelled
// A/B/C rows so the raw MULTI_DELIM never reaches the screen, even if the
// question was later edited down to a single part.
export default function AnswerText({ text, multi = false, prefix = '', className, style }) {
  const value = text || ''
  if (multi || value.includes(MULTI_DELIM)) {
    return (
      <div className="segments" style={style}>
        {splitAnswerText(value).map((seg, i) => (
          <div className="segment-row" key={i}>
            <span className="seg-label">{partLabel(i)}</span>
            <span>{seg || '—'}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <p className={className}>
      {prefix}
      {value}
    </p>
  )
}
