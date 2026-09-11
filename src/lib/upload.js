import { supabase } from '../supabase'

export async function uploadToMediaBucket(file, folder) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}