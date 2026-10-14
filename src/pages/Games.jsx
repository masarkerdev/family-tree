import { useMemo, useState } from 'react'
import { useApp } from '../ctx'
import { bn, shuffle, store } from '../lib/util'
import Avatar from '../components/Avatar'
import { play } from '../lib/sound'
import { makeKinship, poss } from '../lib/kinship'
import { whoAmI, relationQuiz, olderGen, codeQuiz, photoQuiz, pairRound } from '../lib/gameQuestions'

const ROUND = 5
const getPts = () => store('pts') || 0
const addPts = n => { const v = getPts() + n; store('pts', v); return v }

// সাধারণ প্রশ্নোত্তর খেলা: আগে উত্তর বাছুন (বদলানো যায়), তারপর "উত্তর দিন"
function Mcq({ title, make, onExit }) {
  const { open } = useApp()
  const [round, setRound] = useState(() => shuffle(make()).slice(0, ROUND))
  const [i, setI] = useState(0)
  const [sel, setSel] = useState(null)
  const [done, setDone] = useState(false)
  const [score, setScore] = useState(0)
  const [pts, setPts] = useState(getPts)
  const restart = () => { setRound(shuffle(make()).slice(0, ROUND)); setI(0); setSel(null); setDone(false); setScore(0) }

  if (!round.length) return (
    <div className="card game">
      <h2>{title}</h2>
      <p>এই খেলার জন্য এখনো যথেষ্ট তথ্য নেই। আরও সদস্য, বাবা-মা, ছবি বা জন্মসাল যোগ হলে খেলা চালু হবে।</p>
      <button className="btn soft" onClick={onExit}>← সব খেলা</button>
    </div>
  )

  const x = round[i]
  if (!x) {
    const badge = score === round.length ? '🏆 বংশপণ্ডিত' : score >= Math.ceil(round.length * 0.6) ? '🔍 খোঁজদার' : '🌱 নতুন অভিযাত্রী'
    return (
      <div className="card game center">
        <h2>{title}</h2>
        <p className="big-score">{bn(score)}/{bn(round.length)} সঠিক</p>
        <p className="badge-big">{badge}</p>
        <p>মোট পয়েন্ট: <b>{bn(pts)}</b></p>
        <div className="actions center-actions">
          <button className="btn" onClick={restart}>আবার খেলুন</button>
          <button className="btn soft" onClick={onExit}>← সব খেলা</button>
        </div>
      </div>
    )
  }

  const submit = () => {
    if (!sel || done) return
    const ok = sel === x.answer
    play(ok ? 'ok' : 'bad')
    setDone(true)
    if (ok) { setScore(s => s + 1); setPts(addPts(10)) }
  }
  const next = () => { setI(i + 1); setSel(null); setDone(false) }
  const cls = o => 'opt' + (done ? (o.key === x.answer ? ' ok' : o.key === sel ? ' bad' : ' faded') : (o.key === sel ? ' picked' : ''))

  return (
    <div className="card game">
      <div className="game-top">
        <button className="link" onClick={onExit}>← সব খেলা</button>
        <small className="muted">প্রশ্ন {bn(i + 1)}/{bn(round.length)} · পয়েন্ট {bn(pts)}</small>
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${(i / round.length) * 100}%` }} /></div>
      <h3 className="q">{x.q}</h3>
      {x.img && <img className="q-img" src={x.img} alt="" />}
      <div className="opts" role="radiogroup">
        {x.opts.map(o => (
          <button key={o.key} role="radio" aria-checked={sel === o.key} data-sound={done ? 'none' : 'click'}
            className={cls(o)} disabled={done} onClick={() => setSel(o.key)}>
            {o.m && <Avatar m={o.m} size={36} />}<span>{o.label}</span>
          </button>
        ))}
      </div>
      {!done ? (
        <div className="actions">
          <button className="btn" data-sound="none" disabled={!sel} onClick={submit}>উত্তর দিন</button>
          {!sel && <span className="muted small">একটি উত্তর বাছুন, চাইলে বদলাতেও পারবেন</span>}
        </div>
      ) : (
        <div className="fb">
          <p>{sel === x.answer ? 'ঠিক! 🎉' : 'আরেকটু হলেই হতো 😅 সঠিক উত্তর সবুজ রঙে।'}</p>
          {x.hint && sel !== x.answer && <p className="muted small">{x.hint}</p>}
          <div className="actions">
            <button className="btn" data-sound={i + 1 < round.length ? 'click' : 'win'} onClick={next}>{i + 1 < round.length ? 'পরের প্রশ্ন' : 'ফলাফল দেখুন'}</button>
            {x.about && <button className="btn soft" onClick={() => open(x.about)}>পেইজ দেখুন</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// জোড়া মেলাও: বাঁয়ে সন্তান, ডানে বাবা — সন্তান বেছে তারপর তাঁর বাবায় চাপুন
function PairGame({ onExit }) {
  const { fam } = useApp()
  const [pairs, setPairs] = useState(() => pairRound(fam))
  const [parents, setParents] = useState(() => pairs ? shuffle(pairs.map(p => p.parent)) : [])
  const [kid, setKid] = useState(null)
  const [matched, setMatched] = useState({})
  const [miss, setMiss] = useState(null)
  const [tries, setTries] = useState(0)
  const restart = () => { const p = pairRound(fam); setPairs(p); setParents(p ? shuffle(p.map(x => x.parent)) : []); setKid(null); setMatched({}); setTries(0) }

  if (!pairs) return (
    <div className="card game"><h2>🔗 জোড়া মেলাও</h2><p>এই খেলার জন্য অন্তত ৪ জোড়া বাবা-সন্তান দরকার।</p><button className="btn soft" onClick={onExit}>← সব খেলা</button></div>
  )
  const won = Object.keys(matched).length === pairs.length
  const choose = parent => {
    if (!kid || won) return
    const ok = pairs.find(p => p.kid.id === kid)?.parent.id === parent.id
    setTries(t => t + 1)
    if (ok) {
      const m = { ...matched, [kid]: parent.id }
      setMatched(m); setKid(null)
      if (Object.keys(m).length === pairs.length) { play('win'); addPts(Math.max(10, 50 - (tries + 1 - pairs.length) * 10)) } else play('ok')
    } else { play('bad'); setMiss(parent.id); setTimeout(() => setMiss(null), 600) }
  }
  return (
    <div className="card game">
      <div className="game-top"><button className="link" onClick={onExit}>← সব খেলা</button><small className="muted">চেষ্টা {bn(tries)}</small></div>
      <h3 className="q">প্রত্যেক সন্তানকে তাঁর বাবার সাথে মেলান</h3>
      <p className="muted small">আগে বাঁ দিক থেকে একজন সন্তান বাছুন, তারপর ডান দিকে তাঁর বাবায় চাপুন।</p>
      <div className="pair-cols">
        <div>
          {pairs.map(p => (
            <button key={p.kid.id} data-sound="none" disabled={!!matched[p.kid.id] || won}
              className={'opt' + (matched[p.kid.id] ? ' ok' : kid === p.kid.id ? ' picked' : '')} onClick={() => { play('click'); setKid(p.kid.id) }}>
              <Avatar m={p.kid} size={32} /><span>{p.kid.name}</span>
            </button>
          ))}
        </div>
        <div>
          {parents.map(f => (
            <button key={f.id} data-sound="none" disabled={Object.values(matched).includes(f.id) || won}
              className={'opt' + (Object.values(matched).includes(f.id) ? ' ok' : miss === f.id ? ' bad' : '')} onClick={() => choose(f)}>
              <Avatar m={f} size={32} /><span>{f.name}</span>
            </button>
          ))}
        </div>
      </div>
      {won && (
        <div className="fb center">
          <p className="big-score">সব মিলেছে! 🎉</p>
          <p>{bn(tries)} বার চেষ্টায়</p>
          <div className="actions center-actions"><button className="btn" onClick={restart}>আবার খেলুন</button><button className="btn soft" onClick={onExit}>← সব খেলা</button></div>
        </div>
      )}
    </div>
  )
}

// ড্রপডাউন: বংশের মানুষ আগে (নাম অনুযায়ী), বিয়ের সূত্রে আসা মানুষ আলাদা ভাগে
function PersonSelect({ id, value, onChange, label }) {
  const { fam } = useApp()
  const groups = useMemo(() => {
    const byName = (x, y) => x.name.localeCompare(y.name, 'bn')
    // একই নামের মানুষদের আলাদা করতে পাশে পিতা/মা, স্বামী/স্ত্রী, জন্মসাল
    const opt = m => {
      const sub = fam.sub(m).replace(/^[০-৯.]+( · )?/, '')
      return { id: m.id, text: sub ? `${m.name} — ${sub}` : m.name }
    }
    return [
      ['বংশের সদস্য', fam.members.filter(m => m.in_lineage).sort(byName).map(opt)],
      ['বিয়ের সূত্রে আত্মীয়', fam.members.filter(m => !m.in_lineage).sort(byName).map(opt)],
    ].filter(g => g[1].length)
  }, [fam])
  return (
    <label htmlFor={id}>{label}
      <select id={id} className="psel" value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— নাম বাছুন —</option>
        {groups.map(([g, list]) => (
          <optgroup key={g} label={g}>{list.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}</optgroup>
        ))}
      </select>
    </label>
  )
}

function Relation() {
  const { fam } = useApp()
  const kin = useMemo(() => makeKinship(fam), [fam])
  const [a, setA] = useState(null), [b, setB] = useState(null)
  const A = a && fam.byId.get(a), B = b && fam.byId.get(b)
  const ab = A && B ? kin.relate(a, b) : null   // B হলেন A-এর …
  const ba = A && B ? kin.relate(b, a) : null   // A হলেন B-এর …
  const line = (x, y, r) => <>{y.name} হলেন {poss(x.name)} <b>{r.term}</b>{r.alt && <> (সম্পর্কে {r.alt})</>}</>
  return (
    <div className="card game rel">
      <h2>🧬 আমাদের সম্পর্ক কী?</h2>
      <p>যেকোনো দুজনকে বেছে নিন। বাবা ও মা দুই দিক, আর বিয়ের সূত্রও খুঁজে সম্পর্কের নাম বলে দেবে।</p>
      <PersonSelect id="rel-a" label="প্রথম জন" value={a} onChange={setA} />
      <PersonSelect id="rel-b" label="দ্বিতীয় জন" value={b} onChange={setB} />
      {A && B && (
        <div className="rel-out">
          {a === b ? <p>একই মানুষ! 😄</p> : ab ? (
            <>
              <p>{line(A, B, ab)}</p>
              {ba && <p>{line(B, A, ba)}</p>}
            </>
          ) : <p>এই দুজনের কোনো সম্পর্ক এখনো বংশতালিকায় খুঁজে পাওয়া যায়নি। হয়তো কারো বাবা-মা যোগ করা বাকি।</p>}
        </div>
      )}
    </div>
  )
}

export default function Games() {
  const { fam, photos } = useApp()
  const [game, setGame] = useState(null)
  const GAMES = [
    { id: 'who', icon: '🎮', title: 'আমি কে?', desc: 'বাবা, মা, দাদা, নানা আর গল্পের সূত্র থেকে মানুষ চিনুন।', make: () => whoAmI(fam) },
    { id: 'rel', icon: '🧩', title: 'সম্পর্ক বলো', desc: '"ক হলেন খ-এর কী?" চাচা, মামা, ভাতিজা, খালাতো বোন… ঠিকটা বাছুন।', make: () => relationQuiz(fam) },
    { id: 'gen', icon: '⏳', title: 'কে আগের প্রজন্মের?', desc: 'দুজনের মধ্যে কে বংশে আগের প্রজন্মের, বলুন।', make: () => olderGen(fam) },
    { id: 'code', icon: '🔢', title: 'বংশ নম্বর চেনো', desc: '০.১.২ ধরনের বংশ নম্বর দেখে মানুষটিকে চিনুন।', make: () => codeQuiz(fam) },
    { id: 'photo', icon: '📷', title: 'ছবি চেনো', desc: 'ছবি দেখে নাম বলুন। যত ছবি যোগ হবে, খেলা তত জমবে।', make: () => photoQuiz(fam, photos || []) },
    { id: 'pair', icon: '🔗', title: 'জোড়া মেলাও', desc: 'চারজন সন্তানকে তাঁদের বাবার সাথে মেলান।' },
  ]
  const g = GAMES.find(x => x.id === game)
  return (
    <div className="inner">
      <h1 className="page-title">খেলা</h1>
      <p className="muted">খেলতে খেলতে বংশের মানুষদের চিনে নিন। প্রতিটা সঠিক উত্তরে ১০ পয়েন্ট। আপনার মোট পয়েন্ট: <b>{bn(getPts())}</b></p>
      {g ? (
        g.id === 'pair' ? <PairGame key={g.id} onExit={() => setGame(null)} />
          : <Mcq key={g.id} title={`${g.icon} ${g.title}`} make={g.make} onExit={() => setGame(null)} />
      ) : (
        <div className="game-grid">
          {GAMES.map(x => (
            <button key={x.id} className="card game-card" onClick={() => setGame(x.id)}>
              <span className="gc-icon" aria-hidden="true">{x.icon}</span>
              <b>{x.title}</b>
              <small>{x.desc}</small>
              <span className="gc-go">খেলুন →</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid wide" style={{ marginTop: 18 }}><Relation /></div>
    </div>
  )
}
