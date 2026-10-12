import { useState } from 'react'
import { useApp } from '../ctx'
import { bn, honor, lifeSpan } from '../lib/util'
import Avatar from '../components/Avatar'
import Tree from '../components/Tree'

function Branch({ b }) {
  const { fam, open } = useApp()
  const [show, setShow] = useState(false)
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
        {n > 0 && <button className="btn" onClick={() => setShow(!show)}>{show ? 'গাছ লুকান' : '🌳 এই শাখার গাছ'}</button>}
      </div>
      {show && <Tree rootIds={[b.id]} openDepth={2} />}
    </div>
  )
}

export default function Ancestors() {
  const { fam, open } = useApp()
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
        <button className="btn" onClick={() => open(main.id)}>পুরো পেইজ</button>
      </div>

      <h2 className="sec">তাঁর {bn(branches.length)} সন্তান ও তাঁদের শাখা</h2>
      <div className="grid wide">{branches.map(b => <Branch key={b.id} b={b} />)}</div>

      {others.length > 0 && (
        <>
          <h2 className="sec">অন্যান্য পূর্বপুরুষ</h2>
          <p className="muted">যাঁদের সাথে মূল বংশের সংযোগ এখনো তালিকায় যোগ হয়নি।</p>
          <div className="grid wide">{others.map(b => <Branch key={b.id} b={b} />)}</div>
        </>
      )}
    </div>
  )
}
