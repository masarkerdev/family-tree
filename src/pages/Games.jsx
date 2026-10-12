import { useState } from 'react'
import { useApp } from '../ctx'
import { bn, shuffle, store } from '../lib/util'
import Avatar from '../components/Avatar'
import PersonPicker from '../components/PersonPicker'

// বংশতালিকা থেকে নিজে নিজে প্রশ্ন বানায়
function makeQuestions(fam) {
  const A = fam.members.filter(m => m.status === 'approved')
  const qs = []
  for (const m of A) {
    const f = fam.byId.get(m.father_id), mo = fam.byId.get(m.mother_id)
    if (f) {
      qs.push({ q: `${m.name}-এর বাবা কে?`, a: f, ex: [m] })
      const g = fam.byId.get(f.father_id)
      if (g) qs.push({ q: `${m.name}-এর দাদা (বাবার বাবা) কে?`, a: g, ex: [m, f] })
    }
    if (mo) {
      qs.push({ q: `${m.name}-এর মা কে?`, a: mo, ex: [m] })
      const n = fam.byId.get(mo.father_id)
      if (n) qs.push({ q: `${m.name}-এর নানা (মায়ের বাবা) কে?`, a: n, ex: [m, mo] })
    }
    const ks = fam.kids(m.id)
    if (ks.length) qs.push({ q: `নিচের কে ${m.name}-এর সন্তান?`, a: shuffle(ks)[0], ex: [m, ...ks, ...fam.parents(m)] })
    if (m.bio && m.is_deceased && m.bio.length > 20) {
      const clue = m.bio.split(m.name).join('তিনি').slice(0, 110)
      qs.push({ q: `"${clue}${m.bio.length > 110 ? '…' : ''}" — ইনি কে?`, a: m, ex: [] })
    }
  }
  return qs.map(x => {
    const pool = A.filter(p => p.id !== x.a.id && !x.ex.some(e => e.id === p.id))
    const same = pool.filter(p => p.gender === x.a.gender)
    const opts = shuffle([x.a, ...shuffle(same.length >= 3 ? same : pool).slice(0, 3)])
    return { ...x, opts }
  }).filter(x => x.opts.length === 4)
}

function Quiz() {
  const { fam, open } = useApp()
  const [Q, setQ] = useState(null)
  const [pts, setPts] = useState(() => store('pts') || 0)

  const start = () => {
    const list = shuffle(makeQuestions(fam)).slice(0, 5)
    setQ(list.length ? { list, i: 0, score: 0, pick: null } : { empty: true })
  }
  if (!Q) return (
    <div className="card game">
      <h2>🎮 আমি কে?</h2>
      <p>৫টি প্রশ্নে পূর্বপুরুষদের চিনুন। প্রতিটি সঠিক উত্তরে ১০ পয়েন্ট।</p>
      <p className="muted small">আপনার মোট পয়েন্ট: <b>{bn(pts)}</b></p>
      <button className="btn" onClick={start}>খেলা শুরু করুন</button>
    </div>
  )
  if (Q.empty) return <div className="card game"><p>প্রশ্ন বানানোর মতো তথ্য এখনো যথেষ্ট নেই।</p></div>

  const x = Q.list[Q.i]
  if (!x) {
    const s = Q.score, n = Q.list.length
    const badge = s === n ? '🏆 বংশপণ্ডিত' : s >= 3 ? '🔍 খোঁজদার' : '🌱 নতুন অভিযাত্রী'
    return (
      <div className="card game center">
        <h2>{bn(s)}/{bn(n)} সঠিক!</h2>
        <p className="badge-big">{badge}</p>
        <p>মোট পয়েন্ট: <b>{bn(pts)}</b></p>
        <button className="btn" onClick={start}>আবার খেলুন</button>
      </div>
    )
  }
  const choose = p => {
    if (Q.pick) return
    const ok = p.id === x.a.id
    if (ok) { const n = pts + 10; setPts(n); store('pts', n) }
    setQ({ ...Q, pick: p.id, score: Q.score + (ok ? 1 : 0) })
  }
  return (
    <div className="card game">
      <small className="muted">প্রশ্ন {bn(Q.i + 1)}/{bn(Q.list.length)} · পয়েন্ট {bn(pts)}</small>
      <h3 className="q">{x.q}</h3>
      {x.opts.map(p => (
        <button key={p.id} onClick={() => choose(p)}
          className={'opt' + (Q.pick ? (p.id === x.a.id ? ' ok' : p.id === Q.pick ? ' bad' : '') : '')}>
          <Avatar m={p} size={36} />{p.name}
        </button>
      ))}
      {Q.pick && (
        <div className="fb">
          <p>{Q.pick === x.a.id ? 'ঠিক! 🎉' : 'আরেকটু হলেই হতো 😅 সঠিক উত্তর সবুজ রঙে।'}</p>
          <button className="btn" onClick={() => setQ({ ...Q, i: Q.i + 1, pick: null })}>{Q.i + 1 < Q.list.length ? 'পরের প্রশ্ন' : 'ফলাফল দেখুন'}</button>{' '}
          <button className="btn soft" onClick={() => open(x.a.id)}>{x.a.name}-এর পেইজ</button>
        </div>
      )}
    </div>
  )
}

function Relation() {
  const { fam } = useApp()
  const [a, setA] = useState(null), [b, setB] = useState(null)
  return (
    <div className="card game rel">
      <h2>🧬 আমাদের সম্পর্ক কী?</h2>
      <p>যেকোনো দুজনকে বেছে নিন — বাবা ও মা দুই দিক খুঁজে সম্পর্ক বলে দেবে।</p>
      <label>প্রথম জন<PersonPicker value={a} onChange={setA} /></label>
      <label>দ্বিতীয় জন<PersonPicker value={b} onChange={setB} /></label>
      {a && b && <p className="rel-out">{fam.relation(a, b)}</p>}
    </div>
  )
}

export default function Games() {
  return (
    <div className="inner">
      <h1 className="page-title">খেলা</h1>
      <p className="muted">খেলতে খেলতে বংশের মানুষদের চিনে নিন। যত বেশি গল্প ও তথ্য যোগ হবে, প্রশ্ন তত মজার হবে।</p>
      <div className="grid wide"><Quiz /><Relation /></div>
    </div>
  )
}
