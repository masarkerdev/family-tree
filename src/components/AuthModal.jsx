import { useState } from 'react'
import { sb } from '../supabase'
import { normPhone, phoneEmail } from '../lib/phone'
import Sheet from './Sheet'

// লগইন / নতুন একাউন্ট — মোবাইল নম্বর দিয়ে (মূল), অথবা ইমেইল দিয়ে
export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('in')      // in | up | reset
  const [by, setBy] = useState('phone')       // phone | email
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const BN_ERR = {
    'Invalid login credentials': by === 'phone' ? 'মোবাইল নম্বর বা পাসওয়ার্ড মিলছে না।' : 'ইমেইল বা পাসওয়ার্ড মিলছে না।',
    'User already registered': by === 'phone' ? 'এই নম্বরে আগেই একাউন্ট খোলা আছে। লগইন করুন।' : 'এই ইমেইলে আগেই একাউন্ট খোলা আছে। লগইন করুন।',
    'Email not confirmed': 'একাউন্টটি এখনো নিশ্চিত হয়নি। এডমিনকে জানান।',
  }

  async function go(e) {
    e.preventDefault()
    setMsg('')
    let login = email.trim()
    if (by === 'phone') {
      const p = normPhone(phone)
      if (!p) return setMsg('সঠিক মোবাইল নম্বর দিন, যেমন: ০১৭১২৩৪৫৬৭৮')
      login = phoneEmail(p)
    }
    if (mode === 'up' && pw !== pw2) return setMsg('দুই ঘরের পাসওয়ার্ড মিলছে না।')
    setBusy(true)
    let r
    if (mode === 'in') r = await sb.auth.signInWithPassword({ email: login, password: pw })
    else if (mode === 'up') r = await sb.auth.signUp({ email: login, password: pw, options: by === 'phone' ? { data: { phone: normPhone(phone) } } : undefined })
    else r = await sb.auth.resetPasswordForEmail(login, { redirectTo: location.origin })
    setBusy(false)
    if (r.error) return setMsg(BN_ERR[r.error.message] || r.error.message)
    if (mode === 'in') return onClose()
    if (mode === 'up' && r.data.session) return onClose()
    setMsg(mode === 'up'
      ? (by === 'phone' ? 'একাউন্ট তৈরি হয়েছে, কিন্তু এখনো চালু হয়নি। এডমিনকে জানান।' : 'একাউন্ট তৈরি হয়েছে। ইমেইলে পাঠানো লিংকে ক্লিক করে নিশ্চিত করুন, তারপর লগইন করুন।')
      : 'পাসওয়ার্ড বদলানোর লিংক ইমেইলে পাঠানো হয়েছে।')
  }

  const title = mode === 'in' ? 'লগইন' : mode === 'up' ? 'নতুন একাউন্ট' : 'পাসওয়ার্ড ভুলে গেছি'

  return (
    <Sheet onClose={onClose}>
      <form onSubmit={go} className="form">
        <h2>{title}</h2>

        {mode !== 'reset' && (
          <div className="seg" role="tablist" aria-label="কী দিয়ে">
            <button type="button" role="tab" aria-selected={by === 'phone'} className={by === 'phone' ? 'on' : ''} onClick={() => { setBy('phone'); setMsg('') }}>📱 মোবাইল নম্বর</button>
            <button type="button" role="tab" aria-selected={by === 'email'} className={by === 'email' ? 'on' : ''} onClick={() => { setBy('email'); setMsg('') }}>✉️ ইমেইল</button>
          </div>
        )}

        {mode === 'up' && <p className="muted">একাউন্ট খোলার পর বংশতালিকায় নিজের নাম খুঁজে "এটা আমি" চাপুন। এডমিন অনুমোদন দিলে নিজের পেইজ নিজেই সাজাতে পারবেন।</p>}

        {mode === 'reset' ? (
          <>
            <p className="note">মোবাইল নম্বরে খোলা একাউন্টের পাসওয়ার্ড ভুলে গেলে এডমিনকে জানান। তিনি নতুন পাসওয়ার্ড দিয়ে দেবেন।</p>
            <p className="muted small">ইমেইলে খোলা একাউন্ট হলে নিচে ইমেইল দিন, লিংক পাঠানো হবে।</p>
            <label>ইমেইল<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
          </>
        ) : by === 'phone' ? (
          <label>মোবাইল নম্বর
            <input type="tel" inputMode="numeric" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="০১৭XXXXXXXX" autoComplete="tel" />
          </label>
        ) : (
          <label>ইমেইল<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        )}

        {mode !== 'reset' && (
          <label>পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
            <input type="password" required minLength={6} value={pw} onChange={e => setPw(e.target.value)}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
          </label>
        )}
        {mode === 'up' && (
          <label>পাসওয়ার্ড আবার লিখুন
            <input type="password" required minLength={6} value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
          </label>
        )}

        <button className="btn" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : mode === 'in' ? 'ঢুকুন' : mode === 'up' ? 'একাউন্ট খুলুন' : 'লিংক পাঠান'}</button>
        {msg && <p className="note">{msg}</p>}
        <p className="links">
          {mode !== 'in' && <button type="button" className="link" onClick={() => { setMode('in'); setMsg('') }}>লগইন করুন</button>}
          {mode !== 'up' && <button type="button" className="link" onClick={() => { setMode('up'); setMsg('') }}>নতুন একাউন্ট খুলুন</button>}
          {mode !== 'reset' && <button type="button" className="link" onClick={() => { setMode('reset'); setMsg('') }}>পাসওয়ার্ড ভুলে গেছি</button>}
        </p>
      </form>
    </Sheet>
  )
}
