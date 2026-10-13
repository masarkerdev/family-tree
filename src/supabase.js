import { createClient } from '@supabase/supabase-js'

export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Supabase এক বারে ১০০০ সারির বেশি দেয় না, তাই বড় বংশের জন্য পাতা ধরে ধরে আনা হয়
export async function fetchAll(table, select = '*') {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

// ছবি ছোট করে JPEG বানানো — জায়গা ও ইন্টারনেট দুটোই বাঁচে
async function shrink(file, max) {
  const img = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * s)
  c.height = Math.round(img.height * s)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.85))
}

export async function uploadImage(file, folder, max) {
  const blob = await shrink(file, max)
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return { path, url: sb.storage.from('photos').getPublicUrl(path).data.publicUrl }
}

// সদস্যের প্রোফাইল ছবি (সর্বোচ্চ ৫০০px)
export async function uploadPhoto(memberId, file) {
  return (await uploadImage(file, memberId, 500)).url
}

// অ্যালবামের ছবি (সর্বোচ্চ ১৬০০px)
export const uploadAlbumImage = file => uploadImage(file, 'album', 1600)
