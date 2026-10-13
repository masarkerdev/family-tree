import { sb } from '../supabase'
import { useState } from 'react'
import { useApp } from '../ctx'
import { soundOn, setSoundOn, play } from '../lib/sound'

const LINKS = [
  ['', 'হোম'], ['ancestors', 'পূর্বপুরুষ'], ['tree', 'বংশবৃক্ষ'],
  ['memorial', 'স্মরণ'], ['games', 'খেলা'],
]

export default function Nav({ page }) {
  const c = useApp()
  const [snd, setSnd] = useState(soundOn())
  const toggle = () => { const v = !snd; setSoundOn(v); setSnd(v); if (v) play('open') }
  const pendingCount = c.isAdmin ? c.fam.members.filter(m => m.status === 'pending').length : 0
  return (
    <nav className="nav">
      <a className="brand" href="#/">সরকার বংশ</a>
      <div className="tabs">
        {LINKS.map(([p, l]) => (
          <a key={p} href={`#/${p}`} className={(page === p || (p === '' && page === 'm')) ? 'act' : ''}>{l}</a>
        ))}
        {c.isAdmin && <a href="#/admin" className={page === 'admin' ? 'act' : ''}>এডমিন{pendingCount > 0 && <b className="dot">{pendingCount}</b>}</a>}
      </div>
      <div className="who">
        <button className="btn sm soft snd" data-sound="none" onClick={toggle} aria-pressed={snd}
          title={snd ? 'ক্লিকের শব্দ বন্ধ করুন' : 'ক্লিকের শব্দ চালু করুন'} aria-label={snd ? 'শব্দ বন্ধ করুন' : 'শব্দ চালু করুন'}>{snd ? '🔊' : '🔇'}</button>
        {c.session ? (
          <>
            {c.me
              ? <button className="btn sm" onClick={() => c.open(c.me.id)}>আমার পেইজ</button>
              : <button className="btn sm" onClick={c.join}>আমার পেইজ</button>}
            <button className="btn sm soft" onClick={() => sb.auth.signOut()}>লগআউট</button>
          </>
        ) : <button className="btn sm" onClick={c.login}>লগইন</button>}
      </div>
    </nav>
  )
}
