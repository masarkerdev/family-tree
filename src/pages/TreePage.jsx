import { useState } from 'react'
import { useApp } from '../ctx'
import { bn } from '../lib/util'
import Avatar from '../components/Avatar'
import Tree from '../components/Tree'

export default function TreePage() {
  const { fam, open, isAdmin, addNew } = useApp()
  const [q, setQ] = useState('')
  const [depth, setDepth] = useState(3)
  const [ver, setVer] = useState(0)
  const t = q.trim()
  const results = t ? fam.members.filter(m => m.name.includes(t)).slice(0, 12) : []
  const setAll = d => { setDepth(d); setVer(v => v + 1) }

  return (
    <div className="inner wide-inner">
      <h1 className="page-title">বংশবৃক্ষ</h1>
      <p className="muted">নামে চাপলে তাঁর পেইজ খুলবে। গোলাপি ঘেরে স্বামী-স্ত্রী একসাথে, নিচে তাঁদের সন্তান। <b>+</b> চাপলে শাখা খোলে।</p>
      <div className="toolbar">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="নাম লিখে খুঁজুন…" aria-label="সদস্য খুঁজুন" />
        <button className="btn soft" onClick={() => setAll(99)}>সব খুলুন</button>
        <button className="btn soft" onClick={() => setAll(2)}>গুটিয়ে নিন</button>
        {isAdmin && <button className="btn" onClick={() => addNew({})}>+ সদস্য যোগ</button>}
      </div>
      {t && (
        <div className="results">
          {results.length ? results.map(m => (
            <button key={m.id} className="person" onClick={() => open(m.id)}>
              <Avatar m={m} size={36} /><span><b>{m.name}</b><small>{fam.sub(m)}</small></span>
            </button>
          )) : <p className="muted">"{t}" নামে কাউকে পাওয়া যায়নি।</p>}
        </div>
      )}
      <p className="muted small">মোট {bn(fam.members.length)} জন · {bn(fam.maxGen)} প্রজন্ম</p>
      <Tree key={ver} rootIds={fam.roots.map(r => r.id)} openDepth={depth} hit={t} />
    </div>
  )
}
