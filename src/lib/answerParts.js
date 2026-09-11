// Delimiter used to store multi-part answers in a single answer_text column.
// Must match the constant in auto_grade() inside supabase/schema.sql.
export const MULTI_DELIM = '\n\n@@AXIS@@\n\n'

export function splitAnswerText(text) {
  return (text || '').split(MULTI_DELIM)
}

export function partLabel(i) {
  return String.fromCharCode(65 + i) // A, B, C, ...
}

export function isSingle(q) {
  return Array.isArray(q?.answer_parts) && q.answer_parts.length === 1
}

export function isMultiple(q) {
  return Array.isArray(q?.answer_parts) && q.answer_parts.length > 1
}