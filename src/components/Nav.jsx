import { sb } from '../supabase'
import { useState } from 'react'
import { useApp } from '../ctx'
import { soundOn, setSoundOn, play } from '../lib/sound'

const LINKS = [
  ['', 'হোম'], ['ancestors', 'পূর্বপুরুষ'], ['tree', 'বংশবৃক্ষ'], ['roots', 'আমার শিকড়'],
  ['album', 'অ্যালবাম'], ['writings', 'গান-কবিতা-গল্প'], ['places', 'আত্মীয়দের এলাকা'], ['memorial', 'যাদের হারিয়েছি'], ['games', 'গেইমশো'],
]

export default function Nav({ page }) {
  const c = useApp()
  const [snd, setSnd] = useState(soundOn())
  const toggle = () => { const v = !snd; setSoundOn(v); setSnd(v); if (v) play('open') }
  const pendingCount = c.isAdmin ? c.fam.members.filter(m => m.status === 'pending').length : 0
  const pendingPhotos = c.isAdmin ? c.photos.filter(p => p.status === 'pending').length : 0
  return (
    <nav className="nav">
      <a className="brand" data-open href="#/">সরকার বংশ</a>
      <div className="tabs">
        {LINKS.map(([p, l]) => (
          <a key={p} href={`#/${p}`} data-open={p === '' ? '' : undefined} className={(page === p || (p === '' && page === 'm')) ? 'act' : ''}>{l}{p === 'album' && pendingPhotos > 0 && <b className="dot">{pendingPhotos}</b>}</a>
        ))}
        {c.isAdmin && <a href="#/admin" className={page === 'admin' ? 'act' : ''}>এডমিন{pendingCount > 0 && <b className="dot">{pendingCount}</b>}</a>}
      </div>
      <div className="who">
        <button className="btn sm soft snd" data-sound="none" data-open onClick={toggle} aria-pressed={snd}
          title={snd ? 'ক্লিকের শব্দ বন্ধ করুন' : 'ক্লিকের শব্দ চালু করুন'} aria-label={snd ? 'শব্দ বন্ধ করুন' : 'শব্দ চালু করুন'}>{snd ? '🔊' : '🔇'}</button>
        {c.session ? (
          <>
            {c.me
              ? <button className="btn sm" onClick={() => c.open(c.me.id)}>আমার পেইজ</button>
              : <button className="btn sm" onClick={c.join}>আমার পেইজ</button>}
            <button className="btn sm soft" onClick={() => sb.auth.signOut()}>লগআউট</button>
          </>
        ) : <button className="btn sm" data-open onClick={c.login}>লগইন</button>}
      </div>
    </nav>
  )
}
