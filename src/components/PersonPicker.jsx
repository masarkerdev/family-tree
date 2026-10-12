import { useState } from 'react'
import { useApp } from '../ctx'
import Avatar from './Avatar'

// "মোসাঃ", "মো.", "মরহুম" ইত্যাদি বাদ দিয়ে নাম মেলানো, যাতে একটু ভিন্নভাবে লিখলেও পাওয়া যায়
export const normName = s => String(s || '')
  .replace(/(মোছাঃ|মোছা\.|মোসাঃ|মোসা\.|মোসা|মোঃ|মো\.|মরহুমা|মরহুম)/g, ' ')
  .replace(/[\s.:ঃ,\-]+/g, ' ')
  .trim()

export const nameMatches = (name, q) => {
  const n = normName(name), words = normName(q).split(' ').filter(Boolean)
  return words.length > 0 && words.every(w => n.includes(w))
}

// নাম লিখে সদস্য বেছে নেওয়া — একই নামের মানুষ থাকলে বংশ নম্বর ও পিতার নাম দেখে আলাদা করা যায়।
// onCreate দেওয়া থাকলে, নাম না মিললে সেখান থেকেই নতুন মানুষ যোগ করা যায়।
export default function PersonPicker({ value, onChange, filter, placeholder, onCreate, createLabel }) {
  const { fam } = useApp()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const sel = value ? fam.byId.get(value) : null

  if (sel)
    return (
      <div className="picked">
        <Avatar m={sel} size={28} />
        <span>{sel.name}<small>{fam.sub(sel)}</small></span>
        <button type="button" className="x" onClick={() => onChange(null)} aria-label="সরান">✕</button>
      </div>
    )

  const t = q.trim()
  const list = t ? fam.members.filter(m => (!filter || filter(m)) && nameMatches(m.name, t)).slice(0, 8) : []

  async function create() {
    setBusy(true)
    try {
      const id = await onCreate(t)
      if (id) { onChange(id); setQ('') }
    } catch (e) { alert(e.message) }
    setBusy(false)
  }

  return (
    <div className="pp">
      <input value={q} placeholder={placeholder || 'নাম লিখে খুঁজুন…'} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (list[0]) { onChange(list[0].id); setQ('') } } }} />
      {t && (
        <ul className="pp-list">
          {list.map(m => (
            <li key={m.id}>
              <button type="button" onClick={() => { onChange(m.id); setQ('') }}>
                <Avatar m={m} size={30} />
                <span><b>{m.name}</b><small>{fam.sub(m)}</small></span>
              </button>
            </li>
          ))}
          {onCreate && (
            <li>
              <button type="button" className="pp-new" disabled={busy} onClick={create}>
                <span className="pp-plus">＋</span>
                <span><b>{busy ? 'যোগ হচ্ছে…' : `"${t}" নতুন হিসেবে যোগ করুন`}</b>{createLabel && <small>{createLabel}</small>}</span>
              </button>
            </li>
          )}
          {!onCreate && !list.length && <li className="muted small" style={{ padding: 6 }}>মিলছে না।</li>}
        </ul>
      )}
    </div>
  )
}
