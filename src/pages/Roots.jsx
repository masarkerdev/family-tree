import { useEffect, useRef, useState } from 'react'
import { useApp } from '../ctx'
import { bn } from '../lib/util'
import { drawRootsCard, relLabel } from '../lib/rootsCard'
import PersonPicker from '../components/PersonPicker'

// "আমার শিকড়" — নিজের থেকে বংশের প্রথম পুরুষ পর্যন্ত সবার ছবিসহ কার্ড, ছবি হিসেবে নামানো বা শেয়ার করা যায়
export default function Roots({ id }) {
  const { fam, me, open } = useApp()
  const [sel, setSel] = useState(id || me?.id || null)
  const [img, setImg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const canvas = useRef(null)
  const chain = sel ? fam.rootPath(sel) : []

  useEffect(() => { if (id) setSel(id) }, [id])
  useEffect(() => { if (!sel && me) setSel(me.id) }, [me]) // eslint-disable-line

  useEffect(() => {
    let alive = true
    setImg(null)
    if (!chain.length) return
    drawRootsCard(chain, { url: location.host }).then(cv => {
      if (!alive) return
      canvas.current = cv
      setImg(cv.toDataURL('image/png'))
    })
    return () => { alive = false }
  }, [sel, fam]) // eslint-disable-line

  const fileName = () => `shikor-${(chain[0]?.name || 'card').replace(/\s+/g, '-')}.png`
  const getBlob = () => new Promise(r => canvas.current.toBlob(r, 'image/png'))

  async function save() {
    setBusy(true); setMsg('')
    try {
      const blob = await getBlob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = fileName(); a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      setMsg('ছবিটি নামানো হয়েছে।')
    } catch { setMsg('ছবি নামানো গেল না। ছবির উপর চেপে ধরে "Save image" দিয়েও রাখতে পারেন।') }
    setBusy(false)
  }

  async function share() {
    setBusy(true); setMsg('')
    try {
      const file = new File([await getBlob()], fileName(), { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'আমার শিকড়', text: `${chain[0].name} — সরকার বংশ, অলুয়া` })
      } else { await save(); return }
    } catch (e) { if (e?.name !== 'AbortError') setMsg('শেয়ার করা গেল না। আগে ছবিটি নামিয়ে নিন, তারপর শেয়ার করুন।') }
    setBusy(false)
  }

  return (
    <div className="inner roots">
      <h1 className="page-title">আমার শিকড়</h1>
      <p className="muted">নিজের নাম বাছুন। আপনার থেকে বংশের প্রথম পুরুষ পর্যন্ত সবাই ছবিসহ একটি কার্ডে আসবেন। কার্ডটি ছবি হিসেবে নামিয়ে ফেসবুক বা হোয়াটসঅ্যাপে শেয়ার করুন।</p>
      <div className="tb-pick roots-pick">
        <PersonPicker value={sel} onChange={setSel} placeholder="আপনার নাম লিখুন…" />
      </div>

      {!sel && <div className="card empty"><p>উপরে আপনার নাম লিখে বেছে নিন। তালিকায় নাম না থাকলে লগইন করে "আমার পেইজ" থেকে নিজেকে যোগ করুন।</p></div>}

      {sel && (
        <div className="roots-grid">
          <div className="roots-card">
            {img ? <img src={img} alt={`${chain[0]?.name}-এর শিকড় কার্ড`} /> : <div className="roots-wait">কার্ড তৈরি হচ্ছে…</div>}
          </div>
          <div className="roots-side">
            <div className="actions">
              <button className="btn" disabled={!img || busy} onClick={share}>📤 শেয়ার করুন</button>
              <button className="btn soft" disabled={!img || busy} onClick={save}>⬇️ ছবি নামান</button>
            </div>
            {msg && <p className="note">{msg}</p>}
            <h3 className="sec">{bn(chain.length)} প্রজন্মের ধারা</h3>
            <ol className="roots-list">
              {chain.map((m, i) => (
                <li key={m.id}>
                  <button className="person" onClick={() => open(m.id)}>
                    <span className="rl">{relLabel(chain, i)}</span>
                    <span><b>{m.name}</b><small>{fam.code(m) || ''}</small></span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="muted small">কারো ছবি না থাকলে নামের প্রথম অক্ষর দেখায়। সবার পেইজে ছবি যোগ হলে কার্ড আরও সুন্দর হবে।</p>
          </div>
        </div>
      )}
    </div>
  )
}
