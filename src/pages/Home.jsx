import { useApp } from '../ctx'
import { bn, MONTHS, today, dayNo, birthYear, honor } from '../lib/util'
import Avatar from '../components/Avatar'
import FaceStrip from '../components/FaceStrip'

export default function Home() {
  const { fam, content, open } = useApp()
  const A = fam.members.filter(m => m.status === 'approved')
  const t = today(), dn = dayNo()
  // পূর্বপুরুষ পেইজের মতোই: সবচেয়ে বড় গাছের প্রথম পুরুষ আর তাঁর বংশধররা (বউ/জামাই বাদে)
  const root = [...fam.roots].sort((a, b) => fam.descendants(b.id).size - fam.descendants(a.id).size)[0]
  const branches = root ? fam.treeKids(root.id) : []
  const lineage = root ? [...fam.descendants(root.id)].map(id => fam.byId.get(id)).filter(Boolean) : []

  // পরিসংখ্যান
  const males = lineage.filter(m => m.gender === 'male').length
  const females = lineage.filter(m => m.gender === 'female').length
  const dead = lineage.filter(m => m.is_deceased).length
  const living = lineage.filter(m => !m.is_deceased)
  const ageOf = m => {
    if (m.birth_date) {
      const [y, mo, d] = m.birth_date.split('-').map(Number)
      return t.y - y - ((t.m < mo || (t.m === mo && t.d < d)) ? 1 : 0)
    }
    const y = birthYear(m)
    return y ? t.y - y : null
  }
  const AGE = [[0, 15, '১–১৫'], [16, 30, '১৬–৩০'], [31, 45, '৩১–৪৫'], [46, 60, '৪৬–৬০'], [61, 75, '৬১–৭৫'], [76, 90, '৭৬–৯০'], [91, Infinity, '৯১–১০০+']]
  const ages = living.map(ageOf)
  const ageRows = AGE.map(([lo, hi, label]) => ({ label, n: ages.filter(a => a !== null && a >= lo && a <= hi).length }))
  const noAge = ages.filter(a => a === null || a < 0).length
  const ageMax = Math.max(1, ...ageRows.map(r => r.n))
  // মোটের কত শতাংশ
  const pct = n => (lineage.length ? bn(Math.round((n / lineage.length) * 100)) : bn(0))
  // জীবনের পর্যায় (জন্মসাল জানা জীবিত সদস্যদের মধ্যে)
  const known = ages.filter(a => a !== null && a >= 0)
  const STAGES = [
    ['শিশু', '০–১২ বছর', 0, 12], ['কিশোর-কিশোরী', '১৩–১৯ বছর', 13, 19], ['তরুণ', '২০–৩৫ বছর', 20, 35],
    ['মধ্যবয়সী', '৩৬–৫৯ বছর', 36, 59], ['প্রবীণ', '৬০ বছর ও বেশি', 60, Infinity],
  ].map(([name, range, lo, hi]) => ({ name, range, n: known.filter(a => a >= lo && a <= hi).length }))

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
          <div><b>{bn(lineage.length)}</b><span>বংশধর</span></div>
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

        <h2 className="sec">পরিসংখ্যান</h2>
        <p className="muted small">শুধু বংশধরদের হিসাব, বিয়ের সূত্রে আসা বউ বা স্বামী এতে নেই।</p>
        <div className="stat-tiles">
          <div className="stat"><b>{bn(males)}</b><span>পুরুষ</span><em>মোটের {pct(males)}%</em></div>
          <div className="stat"><b>{bn(females)}</b><span>মহিলা</span><em>মোটের {pct(females)}%</em></div>
          <div className="stat"><b>{bn(living.length)}</b><span>জীবিত</span><em>মোটের {pct(living.length)}%</em></div>
          <div className="stat"><b>{bn(dead)}</b><span>প্রয়াত</span><em>মোটের {pct(dead)}%</em></div>
        </div>
        <p className="muted small">মোট বংশধর {bn(lineage.length)} জন ধরে শতাংশ।</p>

        <div className="card stages">
          <h3>জীবনের পর্যায় অনুযায়ী</h3>
          <div className="stage-tiles">
            {STAGES.map(st => (
              <div key={st.name} className="stage">
                <b>{bn(st.n)}</b>
                <span>{st.name}</span>
                <small>{st.range}</small>
                <em>{known.length ? `${bn(Math.round((st.n / known.length) * 100))}%` : '—'}</em>
              </div>
            ))}
          </div>
          <p className="muted small">
            {known.length
              ? `জন্মসাল জানা ${bn(known.length)} জন জীবিত সদস্যের মধ্যে শতাংশ।`
              : 'জীবিত সদস্যদের জন্মসাল যোগ হলে এখানে হিসাব আসবে।'}
            {noAge > 0 && ` আরও ${bn(noAge)} জনের জন্মসাল দেওয়া নেই।`}
          </p>
        </div>
        <div className="card ages">
          <h3>বয়স অনুযায়ী জীবিত সদস্য</h3>
          <div className="age-rows" role="table" aria-label="বয়স অনুযায়ী জীবিত সদস্য">
            {ageRows.map(r => (
              <div key={r.label} className="age-row" role="row" title={`${r.label} বছর: ${bn(r.n)} জন`}>
                <span className="age-l" role="cell">{r.label} বছর</span>
                <span className="age-track" role="cell" aria-hidden="true"><span className="age-bar" style={{ width: r.n ? `${(r.n / ageMax) * 100}%` : 0 }} /></span>
                <span className="age-n" role="cell">{bn(r.n)} জন</span>
              </div>
            ))}
          </div>
          {noAge > 0 && <p className="muted small">আরও {bn(noAge)} জন জীবিত সদস্যের জন্মসাল দেওয়া নেই। সদস্যের পেইজে জন্মসাল যোগ করলে এখানে হিসাবে আসবে।</p>}
        </div>

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
