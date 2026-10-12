import { useApp } from '../ctx'
import { bn2, honor } from '../lib/util'
import Avatar from '../components/Avatar'

// আপনার "বংশ তালিকা ও পারিবারিক বিবরণ" চার্টের মতো পাতা — প্রিন্ট বা PDF করা যায়
export default function FamilyPrint({ id }) {
  const { fam } = useApp()
  const m = fam.byId.get(id)
  if (!m) return <div className="inner"><p className="muted">সদস্য পাওয়া যায়নি।</p></div>
  const code = fam.code(m)
  const kids = fam.kids(id)
  const sons = kids.filter(k => k.gender === 'male'), daus = kids.filter(k => k.gender === 'female')
  const sps = fam.spouses(id)
  const f = fam.byId.get(m.father_id)
  const Kid = ({ k }) => {
    const gk = fam.kids(k.id)
    const s = gk.filter(x => x.gender === 'male'), d = gk.filter(x => x.gender === 'female')
    return (
      <li>
        <span className="pc-name">{k.name}</span>
        {gk.length > 0 && (
          <ul>
            {s.length > 0 && <li><span className="pc-tag">{bn2(s.length)} ছেলে</span>{s.map(x => <span key={x.id} className="pc-g">{x.name}</span>)}</li>}
            {d.length > 0 && <li><span className="pc-tag">{bn2(d.length)} মেয়ে</span>{d.map(x => <span key={x.id} className="pc-g">{x.name}</span>)}</li>}
          </ul>
        )}
      </li>
    )
  }
  const Card = ({ p, line }) => (
    <div className="pc-card">
      <Avatar m={p} size={84} />
      <p>নামঃ {honor(p)}</p>
      {line && <p>{line}</p>}
    </div>
  )
  return (
    <div className="inner print-page">
      <div className="no-print actions">
        <button className="btn" onClick={() => print()}>🖨️ প্রিন্ট / PDF করুন</button>
        <a className="btn soft" href="#/tree">← বংশবৃক্ষে ফিরুন</a>
      </div>
      <h1 className="pc-title">বংশ তালিকা ও পারিবারিক বিবরণ{code ? `-${code}` : ''}</h1>
      <div className="pc-tree">
        <div className="pc-root">{m.name}</div>
        <ul>
          {sons.length > 0 && <li><span className="pc-tag">{bn2(sons.length)} ছেলে</span><ul>{sons.map(k => <Kid key={k.id} k={k} />)}</ul></li>}
          {daus.length > 0 && <li><span className="pc-tag">{bn2(daus.length)} মেয়ে</span><ul>{daus.map(k => <Kid key={k.id} k={k} />)}</ul></li>}
        </ul>
      </div>
      <h2 className="pc-sub">{m.name} এর পরিবার</h2>
      <div className="pc-grid top">
        <Card p={m} line={f ? `পিতাঃ ${honor(f)}` : ''} />
        {sps.map(s => <Card key={s.id} p={s} line={`${s.gender === 'female' ? 'স্বামী' : 'স্ত্রী'}ঃ ${m.name}`} />)}
      </div>
      <div className="pc-grid">
        {kids.map(k => <Card key={k.id} p={k} line={`${m.gender === 'female' ? 'মাতাঃ' : 'পিতাঃ'} ${m.name}`} />)}
      </div>
    </div>
  )
}
