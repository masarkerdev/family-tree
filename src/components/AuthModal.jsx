import { useState } from 'react'
import { sb } from '../supabase'
import { normPhone, phoneEmail, phoneLoginReady } from '../lib/phone'
import Sheet from './Sheet'

// একাউন্ট: শুধু নাম + মোবাইল নম্বর (+ পাসওয়ার্ড)। কোনো OTP বা ইমেইল যাচাই নেই,
// নতুন একাউন্ট এডমিন অনুমতি দিলে তবেই লগইন করতে পারে।
export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('in')      // in | up | reset | admin (ইমেইলে এডমিন লগইন)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const ERR = {
    'Invalid login credentials': mode === 'admin' ? 'ইমেইল বা পাসওয়ার্ড মিলছে না।' : 'মোবাইল নম্বর বা পাসওয়ার্ড মিলছে না।',
    'User already registered': 'এই নম্বরে আগেই একাউন্ট খোলা আছে। লগইন করুন। অনুমতি না পেয়ে থাকলে এডমিনকে জানান।',
    'User is banned': 'আপনার একাউন্ট এখনো এডমিনের অনুমতির অপেক্ষায়। অনুমতি পেলেই লগইন করতে পারবেন।',
    'Email not confirmed': 'Supabase-এ "Confirm email" বন্ধ করা হয়নি। এডমিনকে জানান।',
    'Signups not allowed for this instance': 'এখন নতুন একাউন্ট খোলা বন্ধ আছে। এডমিনকে জানান।',
  }
  const go = m => { setMode(m); setMsg('') }

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    let login = email.trim()
    if (mode === 'in' || mode === 'up') {
      if (!phoneLoginReady) return setMsg('মোবাইল নম্বরে একাউন্ট এখনো চালু হয়নি (VITE_PHONE_LOGIN_EMAIL দেওয়া নেই)। এডমিনকে জানান।')
      const p = normPhone(phone)
      if (!p) return setMsg('সঠিক মোবাইল নম্বর দিন, যেমন: ০১৭১২৩৪৫৬৭৮')
      login = phoneEmail(p)
    }
    if (mode === 'up' && name.trim().length < 3) return setMsg('পুরো নাম লিখুন।')

    setBusy(true)
    let r
    if (mode === 'up') {
      r = await sb.auth.signUp({ email: login, password: pw, options: { data: { name: name.trim(), phone: normPhone(phone) } } })
      await sb.auth.signOut()   // অনুমতি না পাওয়া পর্যন্ত ভেতরে ঢুকতে দেওয়া হয় না
    } else if (mode === 'reset') {
      r = await sb.auth.resetPasswordForEmail(login, { redirectTo: location.origin })
    } else {
      r = await sb.auth.signInWithPassword({ email: login, password: pw })
    }
    setBusy(false)
    if (mode === 'up' && (!r.error || r.error.message === 'User is banned')) return setDone(true)
    if (r.error) return setMsg(ERR[r.error.message] || r.error.message)
    if (mode === 'reset') return setMsg('পাসওয়ার্ড বদলানোর লিংক ইমেইলে পাঠানো হয়েছে।')
    onClose()
  }

  if (done) return (
    <Sheet onClose={onClose}>
      <div className="form center">
        <h2>✅ আবেদন পাঠানো হয়েছে</h2>
        <p>{name.trim()}, আপনার একাউন্ট তৈরি হয়েছে। এডমিন অনুমতি দিলেই এই মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।</p>
        <p className="muted small">পাসওয়ার্ডটা মনে রাখুন। ভুলে গেলে এডমিনকে জানাবেন।</p>
        <button className="btn" onClick={onClose}>ঠিক আছে</button>
      </div>
    </Sheet>
  )

  const title = { in: 'লগইন', up: 'নতুন একাউন্ট', reset: 'পাসওয়ার্ড ভুলে গেছি', admin: 'এডমিন লগইন (ইমেইল)' }[mode]

  return (
    <Sheet onClose={onClose}>
      <form onSubmit={submit} className="form">
        <h2>{title}</h2>

        {mode === 'up' && <p className="muted">নাম আর মোবাইল নম্বর দিন, একটা পাসওয়ার্ড ঠিক করুন। এডমিন অনুমতি দিলে লগইন করতে পারবেন।</p>}

        {mode === 'reset' ? (
          <p className="note">পাসওয়ার্ড ভুলে গেলে এডমিনকে আপনার মোবাইল নম্বর জানান। তিনি নতুন পাসওয়ার্ড দিয়ে দেবেন।</p>
        ) : (
          <>
            {mode === 'up' && <label>আপনার নাম<input required value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="যেমন: মো. রাকিব সরকার" /></label>}
            {mode === 'admin' ? (
              <label>ইমেইল<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
            ) : (
              <label>মোবাইল নম্বর
                <input type="tel" inputMode="numeric" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="০১৭XXXXXXXX" autoComplete="tel" />
              </label>
            )}
            <label>পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
              <span className="pw-wrap">
                <input type={showPw ? 'text' : 'password'} required minLength={6} value={pw} onChange={e => setPw(e.target.value)}
                  autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
                <button type="button" className="pw-eye" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'} title={showPw ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'} aria-pressed={showPw}>
                  {showPw ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </span>
            </label>
            <button className="btn auth-go" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : mode === 'up' ? 'একাউন্ট খুলুন' : 'বাড়িতে প্রবেশ করুন'}</button>
          </>
        )}
        {msg && <p className="note">{msg}</p>}

        <p className="links">
          {mode !== 'in' && <button type="button" className="link" onClick={() => go('in')}>লগইন করুন</button>}
          {mode !== 'up' && <button type="button" className="link strong" onClick={() => go('up')}>নতুন একাউন্ট খুলুন</button>}
          {mode !== 'reset' && mode !== 'admin' && <button type="button" className="link" onClick={() => go('reset')}>পাসওয়ার্ড ভুলে গেছি</button>}
          {mode === 'in' && <button type="button" className="link muted" onClick={() => go('admin')}>এডমিন: ইমেইলে লগইন</button>}
        </p>
      </form>
    </Sheet>
  )
}
