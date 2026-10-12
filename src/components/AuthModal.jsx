import { useState } from 'react'
import { sb } from '../supabase'
import Sheet from './Sheet'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('in') // in | up | reset
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function go(e) {
    e.preventDefault()
    setBusy(true); setMsg('')
    let r
    if (mode === 'in') r = await sb.auth.signInWithPassword({ email, password: pw })
    else if (mode === 'up') r = await sb.auth.signUp({ email, password: pw })
    else r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
    setBusy(false)
    if (r.error) return setMsg(r.error.message)
    if (mode === 'in') return onClose()
    if (mode === 'up' && r.data.session) return onClose()
    setMsg(mode === 'up'
      ? 'একাউন্ট তৈরি হয়েছে। ইমেইলে পাঠানো লিংকে ক্লিক করে নিশ্চিত করুন, তারপর লগইন করুন।'
      : 'পাসওয়ার্ড বদলানোর লিংক ইমেইলে পাঠানো হয়েছে।')
  }

  return (
    <Sheet onClose={onClose}>
      <form onSubmit={go} className="form">
        <h2>{mode === 'in' ? 'লগইন' : mode === 'up' ? 'নতুন একাউন্ট' : 'পাসওয়ার্ড ভুলে গেছি'}</h2>
        {mode === 'up' && <p className="muted">একাউন্ট খোলার পর বংশতালিকায় নিজের নাম খুঁজে "এটা আমি" চাপুন। এডমিন অনুমোদন দিলে নিজের পেইজ নিজেই সাজাতে পারবেন।</p>}
        <label>ইমেইল<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        {mode !== 'reset' && (
          <label>পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
            <input type="password" required minLength={6} value={pw} onChange={e => setPw(e.target.value)}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
          </label>
        )}
        <button className="btn" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : mode === 'in' ? 'ঢুকুন' : mode === 'up' ? 'একাউন্ট খুলুন' : 'লিংক পাঠান'}</button>
        {msg && <p className="note">{msg}</p>}
        <p className="links">
          {mode !== 'in' && <button type="button" className="link" onClick={() => setMode('in')}>লগইন করুন</button>}
          {mode !== 'up' && <button type="button" className="link" onClick={() => setMode('up')}>নতুন একাউন্ট খুলুন</button>}
          {mode !== 'reset' && <button type="button" className="link" onClick={() => setMode('reset')}>পাসওয়ার্ড ভুলে গেছি</button>}
        </p>
      </form>
    </Sheet>
  )
}
