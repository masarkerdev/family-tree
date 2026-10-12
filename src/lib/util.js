export const bn = n => Number(n).toLocaleString('bn-BD', { useGrouping: false })
export const bn2 = n => String(n).padStart(2, '0').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d])

export const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

export const birthYear = m => (m.birth_date ? +m.birth_date.slice(0, 4) : m.birth_year || null)
export const deathYear = m => (m.death_date ? +m.death_date.slice(0, 4) : m.death_year || null)

export function fmtDate(d) {
  if (!d) return ''
  const [y, mo, dd] = d.split('-')
  return `${bn(+dd)} ${MONTHS[+mo - 1]} ${bn(+y)}`
}

export function lifeSpan(m) {
  const b = birthYear(m), d = deathYear(m)
  if (m.is_deceased) return b || d ? `${b ? bn(b) : '?'} – ${d ? bn(d) : '?'}` : 'মরহুম'
  return b ? `জন্ম ${bn(b)}` : ''
}

export const honor = m =>
  m.is_deceased ? `${m.gender === 'female' ? 'মরহুমা' : 'মরহুম'} ${m.name}` : m.name

// বাংলাদেশ সময়ে আজকের দিন-সংখ্যা (প্রতিদিন নতুন আমল/পূর্বপুরুষ দেখাতে)
export const dayNo = () => Math.floor((Date.now() + 6 * 3600e3) / 864e5)

export function today() {
  const d = new Date(Date.now() + 6 * 3600e3)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

export function hashHue(s) {
  let h = 0
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify(val))
  } catch { return null }
}

export function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
