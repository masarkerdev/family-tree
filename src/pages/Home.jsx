import { useApp } from '../ctx'
import { bn, MONTHS, today, dayNo, birthYear, honor } from '../lib/util'
import Avatar from '../components/Avatar'
import FaceStrip from '../components/FaceStrip'

export default function Home() {
  const { fam, content, open } = useApp()
  const A = fam.members.filter(m => m.status === 'approved')
  const t = today(), dn = dayNo()
  const root = fam.roots[0]
  const branches = root ? fam.treeKids(root.id) : []

  const dayOf = d => +d.slice(8, 10), monOf = d => +d.slice(5, 7)
  const birthdays = A.filter(m => !m.is_deceased && m.birth_date && monOf(m.birth_date) === t.m)
    .sort((a, b) => dayOf(a.birth_date) - dayOf(b.birth_date))
  const memorial = A.filter(m => m.is_deceased && m.death_date && monOf(m.death_date) === t.m)
    .sort((a, b) => dayOf(a.death_date) - dayOf(b.death_date))

  const amal = Array.isArray(content.amal) && content.amal.length ? content.amal[dn % content.amal.length] : null
  const quotes = (Array.isArray(content.quotes) ? content.quotes : []).map(q => ({ ...q, m: fam.byId.get(q.member_id) })).filter(q => q.text)
  const storied = A.filter(m => m.is_deceased && m.bio)
  const featured = storied.length ? storied[dn % storied.length] : null

  const Person = ({ m, note, hi }) => (
    <button className={'person' + (hi ? ' hi' : '')} onClick={() => open(m.id)}>
      <Avatar m={m} size={44} />
      <span><b>{m.name}</b><small>{note}</small></span>
    </button>
  )

  return (
    <>
      <section className="hero">
        {content.arrival && <p className="arrival">📍 {content.arrival}</p>}
        <h1>সরকার বংশ</h1>
        <p className="place">অলুয়া · ব্রাহ্মণপাড়া · কুমিল্লা</p>
        <div className="stats">
          <div><b>{bn(A.length)}</b><span>সদস্য</span></div>
          <div><b>{bn(fam.maxGen)}</b><span>প্রজন্ম</span></div>
          <div><b>{bn(branches.length)}</b><span>শাখা</span></div>
        </div>
        <div className="hero-cta">
          <a className="btn gold" href="#/tree">🌳 বংশবৃক্ষ দেখুন</a>
          <a className="btn ghost-light" href="#/games">🎮 খেলুন</a>
        </div>
      </section>

      <section className="faces">
        <h3>সবার মুখ · {bn(A.length)} জন</h3>
        <FaceStrip />
      </section>

      <div className="inner">
        {content.about && (
          <div className="card">
            <h3>আমাদের বংশ</h3>
            <p className="about">{content.about}</p>
          </div>
        )}

        {amal && (
          <div className="amal">
            <small>আজকের আমল · {bn(t.d)} {MONTHS[t.m - 1]}</small>
            <h3>{amal}</h3>
          </div>
        )}

        <div className="grid">
          <div className="card">
            <h3>🎂 {MONTHS[t.m - 1]} মাসের জন্মদিন</h3>
            {birthdays.length ? birthdays.map(m => (
              <Person key={m.id} m={m} hi={dayOf(m.birth_date) === t.d}
                note={`${bn(dayOf(m.birth_date))} ${MONTHS[t.m - 1]} · ${bn(t.y - birthYear(m))} বছর${dayOf(m.birth_date) === t.d ? ' · আজই! 🎉' : ''}`} />
            )) : <p className="muted">এই মাসে কারো জন্মদিন তালিকায় নেই। জন্মতারিখ যোগ হলে এখানে আসবে।</p>}
          </div>
          <div className="card">
            <h3>🕊️ এই মাসে যাঁদের হারিয়েছি</h3>
            {memorial.length ? memorial.map(m => (
              <Person key={m.id} m={m} hi={dayOf(m.death_date) === t.d}
                note={`${bn(dayOf(m.death_date))} ${MONTHS[t.m - 1]} ${bn(+m.death_date.slice(0, 4))}${dayOf(m.death_date) === t.d ? ' · আজ সেই দিন, দোয়া করুন' : ''}`} />
            )) : <p className="muted">মৃত্যুর তারিখ যোগ হলে এখানে আসবে।</p>}
            <a className="link" href="#/memorial">সবার স্মরণ →</a>
          </div>
        </div>

        {branches.length > 0 && (
          <>
            <h2 className="sec">{bn(branches.length)}টি শাখা</h2>
            <div className="grid">
              {branches.map(b => (
                <a key={b.id} className="card branch" href="#/ancestors" style={{ '--h': fam.branchHue(b) }}>
                  <Avatar m={b} size={50} />
                  <span><b>{b.name} শাখা</b><small>বংশধর {bn(fam.descendants(b.id).size)} জন · {bn(fam.generations(b.id))} প্রজন্ম</small></span>
                </a>
              ))}
            </div>
          </>
        )}

        <h2 className="sec">প্রবীণদের কথা</h2>
        {quotes.length ? (
          <div className="grid">
            {quotes.map((q, i) => (
              <figure key={i} className="card quote">
                <blockquote>“{q.text}”</blockquote>
                {q.m && <figcaption><Person m={q.m} note={q.m.occupation || ''} /></figcaption>}
              </figure>
            ))}
          </div>
        ) : <p className="muted">বংশের বড়দের উপদেশ, দোয়া ও স্মৃতিকথা এখানে থাকবে। এডমিন পেইজ থেকে যোগ করুন।</p>}

        {featured && (
          <div className="card featured">
            <span className="ring big"><Avatar m={featured} size={84} /></span>
            <div>
              <small>আজকের পূর্বপুরুষ</small>
              <h3>{honor(featured)}</h3>
              <p>{featured.bio}</p>
              <button className="btn soft" onClick={() => open(featured.id)}>পুরো পেইজ দেখুন</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
