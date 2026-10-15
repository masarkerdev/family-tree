import { useEffect, useRef, useState } from 'react'
import { sb } from '../supabase'
import { useApp } from '../ctx'
import { bn } from '../lib/util'
import { poss } from '../lib/kinship'
import { N, findPlace, km } from '../lib/geo'
import { DISTRICT_COORDS } from '../lib/districtCoords'
import { play } from '../lib/sound'
import Avatar from './Avatar'

// "📍 আমার কাছে কোন আত্মীয়?" — অবস্থান শুধু এই ফোনেই থাকে, কোথাও পাঠানো বা জমা হয় না
const ERR = {
  1: 'লোকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানার পাশের 🔒 চিহ্নে চেপে Location "Allow" করে আবার চেষ্টা করুন।',
  2: 'এই মুহূর্তে অবস্থান পাওয়া যাচ্ছে না। ফোনের Location (GPS) চালু আছে কিনা দেখুন।',
  3: 'অবস্থান পেতে দেরি হচ্ছে। খোলা জায়গায় গিয়ে আবার চেষ্টা করুন।',
}

export default function NearMe({ groups, onPlace }) {
  const { open } = useApp()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [here, setHere] = useState(null)      // { at, u, d }
  const [phones, setPhones] = useState({})
  const [watching, setWatching] = useState(false)
  const watchId = useRef(null), lastU = useRef(null)

  // অবস্থান → উপজেলা → সেখানকার আত্মীয়
  const match = place => {
    if (!place) return { up: [], dist: [] }
    const g = groups.find(x => x.d === place.d)
    if (!g) return { up: [], dist: [] }
    const up = place.u ? g.ups.filter(([u]) => N(u) === N(place.u)).flatMap(([, l]) => l) : []
    const dist = g.ups.flatMap(([, l]) => l).filter(e => !up.includes(e))
    return { up, dist }
  }

  const handle = async (pos, fromWatch) => {
    const at = [pos.coords.latitude, pos.coords.longitude]
    const place = await findPlace(at[0], at[1])
    setHere({ at, ...(place || {}), outside: !place })
    onPlace?.(at, place)
    // চলার পথে: নতুন উপজেলায় ঢুকলে আর সেখানে আত্মীয় থাকলে জানানো
    if (fromWatch && place?.u && place.u !== lastU.current) {
      lastU.current = place.u
      const { up } = match(place)
      if (up.length) {
        play('win')
        const body = `${place.u}-এ ${up.map(e => e.m.name).join(', ')}-এর বাবার বাড়ি`
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker?.getRegistration?.()
            if (reg) reg.showNotification('📍 আত্মীয়ের এলাকায় এসেছেন!', { body, tag: 'near-me' })
            else new Notification('📍 আত্মীয়ের এলাকায় এসেছেন!', { body, tag: 'near-me' })
          }
        } catch { /* কিছু ফোনে সরাসরি নোটিফিকেশন চলে না, পেইজের বার্তাই যথেষ্ট */ }
        navigator.vibrate?.([200, 100, 200])
      }
    } else if (!fromWatch) lastU.current = place?.u || null
  }

  const locate = () => {
    setErr('')
    if (!('geolocation' in navigator)) return setErr('এই ব্রাউজারে লোকেশন পাওয়া যায় না।')
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async p => { await handle(p, false); setBusy(false) },
      e => { setBusy(false); setErr(ERR[e.code] || e.message) },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    )
  }

  const toggleWatch = async () => {
    if (watching) {
      navigator.geolocation.clearWatch(watchId.current); watchId.current = null; setWatching(false)
      return
    }
    try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission() } catch { /* */ }
    watchId.current = navigator.geolocation.watchPosition(p => handle(p, true), e => setErr(ERR[e.code] || e.message),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 30000 })
    setWatching(true)
  }
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current) }, [])

  const { up, dist } = match(here)
  const shown = [...up, ...dist]

  // যাঁদের দেখানো হচ্ছে তাঁদের ফোন নম্বর (লগইন করা সদস্যরাই দেখতে পান)
  useEffect(() => {
    const ids = shown.map(e => e.m.id).filter(id => !(id in phones))
    if (!ids.length) return
    sb.from('member_private').select('member_id,phone').in('member_id', ids)
      .then(({ data }) => setPhones(p => ({ ...p, ...Object.fromEntries(ids.map(id => [id, null])), ...Object.fromEntries((data || []).map(r => [r.member_id, r.phone])) })))
  }, [here]) // eslint-disable-line

  // উপজেলা/জেলায় কেউ না থাকলে সবচেয়ে কাছের আত্মীয়-জেলা
  const nearest = here && !shown.length
    ? groups.filter(g => DISTRICT_COORDS[g.d]).map(g => ({ g, k: km(here.at, DISTRICT_COORDS[g.d]) })).sort((a, b) => a.k - b.k)[0]
    : null

  const Entry = ({ e }) => (
    <div className="nm-row">
      <button className="person" onClick={() => open(e.m.id)}>
        <Avatar m={e.m} size={44} />
        <span>
          <b>{e.m.name}</b>
          <small>{[e.m.village && `গ্রাম: ${e.m.village}`, e.m.bari && `বাড়ি: ${e.m.bari}`, e.m.upazila].filter(Boolean).join(', ')}</small>
          <small>{e.spouses.map(s => `${poss(s.name)} ${e.wife ? 'স্ত্রী' : 'স্বামী'}`).join(', ')}</small>
          {e.kids.length > 0 && <small>{e.wife ? 'নানাবাড়ি' : 'দাদাবাড়ি'}: {e.kids.map(k => k.name).join(', ')}</small>}
        </span>
      </button>
      {phones[e.m.id] && <a className="btn sm" href={`tel:${phones[e.m.id]}`}>📞 কল করুন</a>}
    </div>
  )

  return (
    <section className="card near-me">
      <div className="nm-head">
        <div>
          <h2>📍 আমার কাছে কোন আত্মীয়?</h2>
          <p className="muted small">কোথাও বেড়াতে গেলে চাপুন। আপনার অবস্থান শুধু এই ফোনেই থাকে, কোথাও জমা হয় না।</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={locate} disabled={busy}>{busy ? 'খুঁজছি…' : here ? '🔄 আবার দেখুন' : '📍 আমি এখন কোথায়?'}</button>
          <button className={'btn soft' + (watching ? ' on' : '')} onClick={toggleWatch} aria-pressed={watching}>{watching ? '🔔 চলার পথে জানানো চালু · বন্ধ করুন' : '🔔 চলার পথে জানাও'}</button>
        </div>
      </div>
      {watching && <p className="note small">সাইটটা খোলা রাখুন। নতুন কোনো আত্মীয়ের উপজেলায় ঢুকলেই ফোনে জানিয়ে দেবে।</p>}
      {err && <p className="note">{err}</p>}

      {here && (here.outside ? (
        <p className="nm-where">🌏 আপনি এখন বাংলাদেশের বাইরে আছেন বলে মনে হচ্ছে।</p>
      ) : (
        <>
          <p className="nm-where">আপনি এখন <b>{here.u ? `${here.u}, ` : ''}{here.d}</b>-এ আছেন{up.length ? ' 🎉' : ''}</p>
          {up.length > 0 && (
            <>
              <h3 className="nm-sub">এই উপজেলায় যাঁদের বাবার বাড়ি · {bn(up.length)}</h3>
              {up.map(e => <Entry key={e.m.id} e={e} />)}
            </>
          )}
          {dist.length > 0 && (
            <>
              <h3 className="nm-sub">{up.length ? 'একই জেলায় আরও' : `এই উপজেলায় কেউ নেই, তবে ${here.d} জেলায়`} · {bn(dist.length)}</h3>
              {dist.map(e => <Entry key={e.m.id} e={e} />)}
            </>
          )}
          {!shown.length && (
            <p className="muted">
              এই জেলায় এখনো কোনো আত্মীয়ের বাড়ির ঠিকানা দেওয়া নেই।
              {nearest && <> সবচেয়ে কাছে <b>{nearest.g.d}</b> জেলা, প্রায় <b>{bn(Math.round(nearest.k))} কিমি</b> দূরে ({bn(nearest.g.n)}টি পরিবার)।</>}
            </p>
          )}
        </>
      ))}
    </section>
  )
}
