import { useState } from 'react'
import { useApp } from '../ctx'
import Avatar from './Avatar'

// নাম লিখে সদস্য বেছে নেওয়া — একই নামের মানুষ থাকলে বংশ নম্বর ও পিতার নাম দেখে আলাদা করা যায়
export default function PersonPicker({ value, onChange, filter, placeholder }) {
  const { fam } = useApp()
  const [q, setQ] = useState('')
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
  const list = t ? fam.members.filter(m => (!filter || filter(m)) && m.name.includes(t)).slice(0, 8) : []
  return (
    <div className="pp">
      <input value={q} placeholder={placeholder || 'নাম লিখে খুঁজুন…'} onChange={e => setQ(e.target.value)} />
      {list.length > 0 && (
        <ul className="pp-list">
          {list.map(m => (
            <li key={m.id}>
              <button type="button" onClick={() => { onChange(m.id); setQ('') }}>
                <Avatar m={m} size={30} />
                <span><b>{m.name}</b><small>{fam.sub(m)}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {t && !list.length && <p className="muted small">মিলছে না।</p>}
    </div>
  )
}
