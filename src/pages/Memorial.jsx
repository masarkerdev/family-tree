import { useState } from 'react'
import { sb } from '../supabase'
import { useApp } from '../ctx'
import { bn, MONTHS, today, dayNo, store, honor, lifeSpan } from '../lib/util'
import Avatar from '../components/Avatar'
import Sheet from '../components/Sheet'

// স্মরণের দোয়া
const DUAS = [
  {
    text: 'রাব্বানাগফির লানা ওয়ালি ইখওয়ানিনাল্লাযীনা সাবাকুনা বিল ঈমান...',
    ref: 'সুরা আল-হাশর, আয়াত ১০',
    meaning: 'হে আমাদের পালনকর্তা, আমাদের এবং আমাদের সেই ভাইদের ক্ষমা করুন যারা আমাদের পূর্বে ঈমান এনেছে।',
  },
  {
    text: 'আল্লাহুম্মাগ ফিরলাহু ওয়ারহামহু, ওয়া আফিহি ওয়া‘ফু আনহু; ওয়া আকরিম নুজুলাহু, ওয়া ওয়াসসি‘ মাদখালাহু; ওয়াগসিলহু বিল মা-য়ি ওয়াস সালজি ওয়াল বারাদি, ওয়ানাক্কিহি মিনাল খাতা-ইয়া কামা ইউনাক্কাস সাওবুল আবইয়াযু মিনাদ দানাসি; ওয়া আবদিলহু দা-রান খাইরান মিন দা-রিহি, ওয়া আহলান খাইরান মিন আহলিহি, ওয়া যাওজান খাইরান মিন যাওজিহি; ওয়া আদখিলহুল জান্নাতা, ওয়া আ‘ইযহু মিন আযাবিল কাবরি ওয়া মিন আযাবিন নার।',
    meaning: 'হে আল্লাহ, তাকে ক্ষমা করুন এবং তাকে দয়া করুন। শান্তিতে রাখুন এবং তার থাকার স্থানটিকে মর্যাদাশীল করুন। তার কবর প্রশস্ত করে দিন। বরফ ও তুষারের শুভ্রতা দিয়ে, তাকে গুনাহ থেকে এমনভাবে পরিচ্ছন্ন করে দিন যেমন ময়লা থেকে সাদা কাপড় পরিষ্কার হয়।',
  },
]

export default function Memorial() {
  const { fam, open } = useApp()
  const [extra, setExtra] = useState({})
  const [reading, setReading] = useState(null)   // যাঁর জন্য দোয়া পড়া হচ্ছে
  const t = today()
  const D = fam.members.filter(m => m.is_deceased && m.status === 'approved')
  const dated = D.filter(m => m.death_date).sort((a, b) => a.death_date.slice(5).localeCompare(b.death_date.slice(5)))
  const undated = D.filter(m => !m.death_date)

  // পপআপ বন্ধ হলে (পড়া শেষ বা কেটে দিলে) একবার গোনা হয়; একই মানুষের জন্য একজন দিনে একবারই গোনা হয়
  async function finish() {
    const m = reading
    setReading(null)
    if (!m) return
    const key = 'dua-' + m.id
    if (store(key) === dayNo()) return
    store(key, dayNo())
    setExtra(e => ({ ...e, [m.id]: (e[m.id] || 0) + 1 }))
    await sb.rpc('add_dua', { mid: m.id })
  }

  const Card = ({ m }) => {
    const ago = m.death_date ? t.y - +m.death_date.slice(0, 4) : null
    const count = (m.dua_count || 0) + (extra[m.id] || 0)
    return (
      <div className="card mem">
        <Avatar m={m} size={56} />
        <div>
          <b>{honor(m)}</b>
          <small className="muted">
            {m.death_date ? `${bn(+m.death_date.slice(8, 10))} ${MONTHS[+m.death_date.slice(5, 7) - 1]} ${bn(+m.death_date.slice(0, 4))}${ago ? ` · ${bn(ago)} বছর আগে` : ''}` : lifeSpan(m)}
          </small>
          <small className="dua-count">🤲 {count ? `${bn(count)} জন দোয়া করেছেন` : 'এখনো কেউ দোয়া করেননি'}</small>
          <div className="actions">
            <button className="btn sm" onClick={() => setReading(m)}>🤲 দোয়া করতে চাই</button>
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

      {reading && (
        <Sheet onClose={finish}>
          <div className="dua">
            <div className="dua-head">
              <Avatar m={reading} size={56} />
              <div>
                <small className="muted">দোয়া করছেন</small>
                <h2>{honor(reading)}</h2>
              </div>
            </div>
            {DUAS.map((d, i) => (
              <div key={i} className="dua-item">
                <span className="dua-no">{bn(i + 1)}</span>
                <div>
                  <p className="dua-text">{d.text}</p>
                  {d.ref && <p className="muted small">({d.ref})</p>}
                  <p className="dua-mean"><b>অর্থ:</b> {d.meaning}</p>
                </div>
              </div>
            ))}
            <div className="actions">
              <button className="btn" onClick={finish}>পড়া শেষ · আমিন</button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
