import { useMemo, useRef, useState } from 'react'
import { useApp } from '../ctx'
import { bn, honor } from '../lib/util'
import Avatar from '../components/Avatar'
import Tree from '../components/Tree'
import PersonPicker from '../components/PersonPicker'

export default function TreePage() {
  const { fam, open, isAdmin, addNew, me } = useApp()
  const [depth, setDepth] = useState(3)
  const [ver, setVer] = useState(0)
  const [sel, setSel] = useState(null)
  const pz = useRef()
  const setAll = d => { setDepth(d); setVer(v => v + 1) }

  const chain = useMemo(() => (sel ? fam.rootPath(sel) : []), [sel, fam])
  const path = useMemo(() => new Set(chain.map(m => m.id)), [chain])

  // কাউকে বাছলে তাঁর থেকে প্রথম পুরুষ পর্যন্ত পথ জ্বলে ওঠে, আর তিনি পর্দার মাঝে আসেন
  const pick = id => {
    setSel(id)
    setTimeout(() => pz.current?.focus(id), 80)
  }

  return (
    <div className="inner wide-inner">
      <h1 className="page-title">বংশবৃক্ষ</h1>
      <p className="muted">আঙুল বা মাউসে টেনে গাছ সরান, দুই আঙুলে বা মাউসের চাকায় বড়-ছোট করুন। কারো নামে চাপলে তাঁর থেকে বংশের প্রথম পুরুষ পর্যন্ত পথ জ্বলে উঠবে।</p>
      <div className="toolbar">
        <div className="tb-pick"><PersonPicker value={null} onChange={pick} placeholder="নাম লিখে খুঁজুন…" /></div>
        {me && <button className="btn soft" onClick={() => pick(me.id)}>আমাকে দেখাও</button>}
        <button className="btn soft" onClick={() => setAll(99)}>সব খুলুন</button>
        <button className="btn soft" onClick={() => { setSel(null); setAll(2) }}>গুটিয়ে নিন</button>
        {isAdmin && <button className="btn" onClick={() => addNew({})}>+ সদস্য যোগ</button>}
      </div>

      {sel && chain.length > 0 && (
        <div className="trail">
          <div className="trail-steps">
            {chain.map((m, i) => (
              <span key={m.id} className="trail-step">
                {i > 0 && <span className="trail-arrow" aria-hidden="true">←</span>}
                <button className="chip" onClick={() => pick(m.id)}><Avatar m={m} size={24} />{m.name}</button>
              </span>
            ))}
          </div>
          <div className="actions">
            <button className="btn sm" onClick={() => open(sel)}>{honor(fam.byId.get(sel))}-এর পেইজ</button>
            <a className="btn sm pink" href={`#/roots/${sel}`}>🌱 শিকড় কার্ড</a>
            <button className="btn sm soft" onClick={() => setSel(null)}>আলো নেভান</button>
          </div>
        </div>
      )}

      <p className="muted small">মোট {bn(fam.members.length)} জন · {bn(fam.maxGen)} প্রজন্ম</p>
      <Tree key={ver} live pzRef={pz} rootIds={fam.roots.map(r => r.id)} openDepth={depth} path={path} onPick={id => { pick(id); open(id) }} />
    </div>
  )
}
