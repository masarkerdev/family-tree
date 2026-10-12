import { useState } from 'react'
import { sb } from '../supabase'
import { useApp } from '../ctx'
import { bn, MONTHS, today, dayNo, store, honor, lifeSpan } from '../lib/util'
import Avatar from '../components/Avatar'

export default function Memorial() {
  const { fam, open } = useApp()
  const [extra, setExtra] = useState({})
  const t = today()
  const D = fam.members.filter(m => m.is_deceased && m.status === 'approved')
  const dated = D.filter(m => m.death_date).sort((a, b) => a.death_date.slice(5).localeCompare(b.death_date.slice(5)))
  const undated = D.filter(m => !m.death_date)

  async function dua(m) {
    const key = 'dua-' + m.id
    if (store(key) === dayNo()) return
    store(key, dayNo())
    setExtra(e => ({ ...e, [m.id]: (e[m.id] || 0) + 1 }))
    await sb.rpc('add_dua', { mid: m.id })
  }

  const Card = ({ m }) => {
    const done = store('dua-' + m.id) === dayNo()
    const ago = m.death_date ? t.y - +m.death_date.slice(0, 4) : null
    return (
      <div className="card mem">
        <Avatar m={m} size={56} />
        <div>
          <b>{honor(m)}</b>
          <small className="muted">
            {m.death_date ? `${bn(+m.death_date.slice(8, 10))} ${MONTHS[+m.death_date.slice(5, 7) - 1]} ${bn(+m.death_date.slice(0, 4))}${ago ? ` · ${bn(ago)} বছর আগে` : ''}` : lifeSpan(m)}
          </small>
          <div className="actions">
            <button className={'btn sm' + (done ? ' soft' : '')} onClick={() => dua(m)} disabled={done}>
              🤲 {done ? 'দোয়া করেছেন' : 'দোয়া করলাম'} · {bn((m.dua_count || 0) + (extra[m.id] || 0))}
            </button>
            <button className="btn sm soft" onClick={() => open(m.id)}>পেইজ</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="inner">
      <h1 className="page-title">স্মরণ</h1>
      <p className="muted">যাঁরা আমাদের ছেড়ে চলে গেছেন, তাঁদের জন্য দোয়া। মাস অনুযায়ী সাজানো, চলতি মাস আগে।</p>
      {[...Array(12)].map((_, i) => {
        const mo = ((t.m - 1 + i) % 12) + 1
        const L = dated.filter(m => +m.death_date.slice(5, 7) === mo)
        return L.length ? (
          <section key={mo}>
            <h2 className="sec">{MONTHS[mo - 1]}{mo === t.m ? ' · এই মাস' : ''}</h2>
            <div className="grid">{L.map(m => <Card key={m.id} m={m} />)}</div>
          </section>
        ) : null
      })}
      {undated.length > 0 && (
        <section>
          <h2 className="sec">তারিখ জানা নেই</h2>
          <div className="grid">{undated.map(m => <Card key={m.id} m={m} />)}</div>
        </section>
      )}
      {!D.length && <p className="muted">এখনো কোনো তথ্য নেই।</p>}
    </div>
  )
}
