function renderRuns(text) {
  return (text || '').split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

export default function RichText({ text, as: Tag = 'span' }) {
  return <Tag className="rich-text">{renderRuns(text)}</Tag>
}