import { useMemo, useState } from 'react'
import { useApp } from '../ctx'
import { bn, honor, lifeSpan } from '../lib/util'
import Avatar from '../components/Avatar'
import Tree from '../components/Tree'
import Sheet from '../components/Sheet'

const ORD = ['', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম']
const ordinal = n => ORD[n] || `${bn(n)}তম`
const genName = n => ['', 'সন্তান', 'নাতি-নাতনি', 'পুতি-পুতনি'][n] || ''

// একজনের উত্তরসূরিরা: বড় প্যানেলে গাছ (টেনে-জুম) অথবা প্রজন্ম অনুযায়ী তালিকা
export function Descendants({ person, onClose }) {
  const { fam, open } = useApp()
  const [view, setView] = useState('list')

  // প্রজন্ম ধরে ভাগ: প্রতিটি প্রজন্মে বাবা/মা অনুযায়ী দল
  const levels = useMemo(() => {
    const out = []
    let cur = [person]
    while (cur.length) {
      const groups = cur.map(p => ({ parent: p, kids: fam.treeKids(p.id) })).filter(g => g.kids.length)
      if (!groups.length) break
      out.push(groups)
      cur = groups.flatMap(g => g.kids)
    }
    return out
  }, [person, fam])

  const all = levels.flatMap(l => l.flatMap(g => g.kids))
  const living = all.filter(m => !m.is_deceased).length

  return (
    <Sheet onClose={onClose} wide>
      <div className="desc">
        <div className="desc-head">
          <span className="ring"><Avatar m={person} size={64} /></span>
          <div>
            <small className="muted">উত্তরসূরি</small>
            <h2>{honor(person)}</h2>
            <p className="desc-stats">
              <span><b>{bn(all.length)}</b> জন বংশধর</span>
              <span><b>{bn(levels.length)}</b> প্রজন্ম</span>
              <span><b>{bn(living)}</b> জন জীবিত</span>
            </p>
          </div>
        </div>

        <div className="seg" role="tablist" aria-label="দেখার ধরন">
          <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>📋 প্রজন্ম অনুযায়ী</button>
          <button role="tab" aria-selected={view === 'tree'} className={view === 'tree' ? 'on' : ''} onClick={() => setView('tree')}>🌳 গাছ</button>
        </div>

        {view === 'list' ? (
          <div className="gens">
            {levels.map((groups, i) => {
              const count = groups.reduce((s, g) => s + g.kids.length, 0)
              return (
                <section key={i} className="gen">
                  <h3 className="gen-h">
                    <span className="gen-no">{ordinal(i + 1)} প্রজন্ম</span>
                    {genName(i + 1) && <span className="muted"> · {genName(i + 1)}</span>}
                    <span className="gen-c">{bn(count)} জন</span>
                  </h3>
                  {groups.map(g => (
                    <div key={g.parent.id} className="fam-row">
                      {i > 0 && <p className="fam-of">{g.parent.name}-এর ঘরে</p>}
                      <div className="kids">
                        {g.kids.map(k => (
                          <button key={k.id} className={'kid' + (k.is_deceased ? ' dead' : '')} onClick={() => open(k.id)}>
                            <Avatar m={k} size={40} />
                            <span><b>{k.name}</b><small>{[fam.code(k), k.is_deceased ? 'মরহুম' : lifeSpan(k)].filter(Boolean).join(' · ')}</small>{Array.isArray(k.skills) && k.skills.length > 0 && <small className="kid-skill">⭐ {k.skills.slice(0, 2).join(', ')}{k.skills.length > 2 ? '…' : ''}</small>}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
        ) : (
          <div className="desc-tree">
            <p className="muted small">টেনে সরান, দুই আঙুলে বা মাউসের চাকায় বড়-ছোট করুন। নামে চাপলে পেইজ খুলবে।</p>
            <Tree live rootIds={[person.id]} openDepth={3} onPick={open} />
          </div>
        )}
      </div>
    </Sheet>
  )
}

function Branch({ b, onShow }) {
  const { fam, open } = useApp()
  const n = fam.descendants(b.id).size
  return (
    <div className="card branch-card" style={{ '--h': fam.branchHue(b) }}>
      <div className="bc-head">
        <Avatar m={b} size={60} />
        <div>
          <h3>{honor(b)}</h3>
          <small className="muted">{fam.code(b)} · {lifeSpan(b)}</small>
        </div>
      </div>
      <p>{fam.kidCount(b.id) || 'সন্তানের তথ্য এখনো যোগ হয়নি'} · বংশধর <b>{bn(n)}</b> জন · {bn(fam.generations(b.id))} প্রজন্ম</p>
      <div className="actions">
        <button className="btn soft" onClick={() => open(b.id)}>পেইজ দেখুন</button>
        {n > 0 && <button className="btn" onClick={() => onShow(b)}>🌳 আমার উত্তরসূরি</button>}
      </div>
    </div>
  )
}

export default function Ancestors() {
  const { fam, open } = useApp()
  const [show, setShow] = useState(null)
  const roots = [...fam.roots].sort((a, b) => fam.descendants(b.id).size - fam.descendants(a.id).size)
  const [main, ...others] = roots
  if (!main) return <div className="inner"><p className="muted">এখনো কোনো পূর্বপুরুষ যোগ হয়নি।</p></div>
  const branches = fam.treeKids(main.id)
  return (
    <div className="inner">
      <h1 className="page-title">আমাদের পূর্বপুরুষ</h1>
      <div className="card root-card">
        <span className="ring big"><Avatar m={main} size={110} /></span>
        <h2>{honor(main)}</h2>
        <p className="muted">বংশের প্রথম জানা পুরুষ · বংশ নম্বর {fam.code(main)}</p>
        {main.bio && <p className="bio">{main.bio}</p>}
        <div className="stats dark">
          <div><b>{bn(fam.descendants(main.id).size)}</b><span>বংশধর</span></div>
          <div><b>{bn(fam.generations(main.id))}</b><span>প্রজন্ম</span></div>
          <div><b>{bn(branches.length)}</b><span>সন্তান</span></div>
        </div>
        <div className="actions center-actions">
          <button className="btn" onClick={() => open(main.id)}>পুরো পেইজ</button>
          <button className="btn soft" onClick={() => setShow(main)}>🌳 আমার উত্তরসূরি</button>
        </div>
      </div>

      <h2 className="sec">তাঁর {bn(branches.length)} সন্তান ও তাঁদের শাখা</h2>
      <div className="grid wide">{branches.map(b => <Branch key={b.id} b={b} onShow={setShow} />)}</div>

      {others.length > 0 && (
        <>
          <h2 className="sec">অন্যান্য পূর্বপুরুষ</h2>
          <p className="muted">যাঁদের সাথে মূল বংশের সংযোগ এখনো তালিকায় যোগ হয়নি।</p>
          <div className="grid wide">{others.map(b => <Branch key={b.id} b={b} onShow={setShow} />)}</div>
        </>
      )}

      {show && <Descendants person={show} onClose={() => setShow(null)} />}
    </div>
  )
}
