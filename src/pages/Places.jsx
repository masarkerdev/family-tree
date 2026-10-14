import { lazy, Suspense, useMemo, useState } from 'react'
import { useApp } from '../ctx'
import { bn } from '../lib/util'
import { hasPlace } from '../lib/places'
import { poss } from '../lib/kinship'
import Avatar from '../components/Avatar'
import { normDistrict, DISTRICT_COORDS } from '../lib/districtCoords'

const RelativesMap = lazy(() => import('../components/RelativesMap'))

// আত্মীয়দের এলাকা: বিয়ের সূত্রে আসা বউ ও জামাইদের বাড়ি জেলা ও উপজেলা ধরে
export default function Places() {
  const { fam, open, isAdmin } = useApp()
  const [district, setDistrict] = useState(null)

  const { groups, missing, hasCols } = useMemo(() => {
    const hasCols = fam.members.some(m => 'skills' in m)
    const outs = fam.members.filter(m => !m.in_lineage && m.status === 'approved' && fam.spouses(m.id).some(s => s.in_lineage))
    const entry = m => ({
      m,
      spouses: fam.spouses(m.id).filter(s => s.in_lineage),
      kids: fam.kids(m.id).filter(k => k.status === 'approved'),
      wife: m.gender === 'female',
    })
    const withPlace = outs.filter(hasPlace).map(entry)
    const byD = new Map()
    for (const e of withPlace) {
      const d = e.m.district ? normDistrict(e.m.district) : 'জেলা জানা নেই', u = e.m.upazila ? e.m.upazila.normalize('NFC').trim() : 'উপজেলা জানা নেই'
      if (!byD.has(d)) byD.set(d, new Map())
      const byU = byD.get(d)
      if (!byU.has(u)) byU.set(u, [])
      byU.get(u).push(e)
    }
    const groups = [...byD.entries()]
      .map(([d, byU]) => ({ d, ups: [...byU.entries()].sort((a, b) => b[1].length - a[1].length), n: [...byU.values()].reduce((s, l) => s + l.length, 0) }))
      .sort((a, b) => b.n - a.n || a.d.localeCompare(b.d, 'bn'))
    return { groups, missing: outs.filter(m => !hasPlace(m)), hasCols }
  }, [fam])

  if (!hasCols) return (
    <div className="inner">
      <h1 className="page-title">আত্মীয়দের এলাকা</h1>
      <div className="card"><p>এই পেইজ চালু করতে এডমিন Supabase-এর SQL Editor-এ <code>places-skills.sql</code> একবার চালাবেন।</p></div>
    </div>
  )

  const shown = district ? groups.filter(g => g.d === district) : groups
  const nUp = groups.reduce((s, g) => s + g.ups.length, 0)

  return (
    <div className="inner">
      <h1 className="page-title">আত্মীয়দের এলাকা</h1>
      <p className="muted">বিয়ের সূত্রে আসা বউ ও জামাইদের বাবার বাড়ি। এখানেই কারো নানাবাড়ি, কারো দাদাবাড়ি।</p>

      {groups.length > 0 && (
        <>
          <div className="stat-tiles three">
            <div className="stat"><b>{bn(groups.length)}</b><span>জেলা</span></div>
            <div className="stat"><b>{bn(nUp)}</b><span>উপজেলা</span></div>
            <div className="stat"><b>{bn(groups.reduce((s, g) => s + g.n, 0))}</b><span>পরিবারের সাথে আত্মীয়তা</span></div>
          </div>
          <Suspense fallback={<div className="rel-map map-wait">মানচিত্র আসছে…</div>}>
            <RelativesMap groups={groups} selected={district} onSelect={setDistrict} />
          </Suspense>
          {groups.some(g => !DISTRICT_COORDS[g.d]) && (
            <p className="muted small">মানচিত্রে বসানো যায়নি: {groups.filter(g => !DISTRICT_COORDS[g.d]).map(g => g.d).join(', ')}। জেলার নামের বানান তালিকার সাথে মিলিয়ে দিন।</p>
          )}
          <p className="muted small">রঙিন জেলায় চাপলে মানচিত্র সেই জেলায় বড় হবে, আর নিচে শুধু সেই জেলার আত্মীয়রা দেখাবে। গোলাপি উপজেলায় আত্মীয়দের বাড়ি, গোলাপি বিন্দু আমাদের বাড়ি অলুয়া।</p>
          <div className="district-chips" role="group" aria-label="জেলা বাছুন">
            <button className={'chip' + (!district ? ' on' : '')} onClick={() => setDistrict(null)}>সব জেলা</button>
            {groups.map(g => (
              <button key={g.d} className={'chip' + (district === g.d ? ' on' : '')} onClick={() => setDistrict(g.d)}>{g.d} · {bn(g.n)}</button>
            ))}
          </div>
        </>
      )}

      {!groups.length && <div className="card empty"><p>এখনো কোনো বউ বা জামাইয়ের বাড়ির ঠিকানা দেওয়া হয়নি। তাঁদের পেইজে গিয়ে সম্পাদনা থেকে গ্রাম, উপজেলা ও জেলা যোগ করুন।</p></div>}

      {shown.map(g => (
        <section key={g.d} className="place-d">
          <h2 className="sec">{g.d} <small className="muted">· {bn(g.n)}টি পরিবার</small></h2>
          {g.ups.map(([u, list]) => (
            <div key={u} className="card place-u">
              <h3>{u} <small className="muted">· {bn(list.length)}</small></h3>
              {list.map(e => (
                <div key={e.m.id} className="place-row">
                  <button className="person" onClick={() => open(e.m.id)}>
                    <Avatar m={e.m} size={44} />
                    <span>
                      <b>{e.m.name}</b>
                      <small>{e.m.village ? `গ্রাম: ${e.m.village} · ` : ''}{e.spouses.map(s => `${poss(s.name)} ${e.wife ? 'স্ত্রী' : 'স্বামী'}`).join(', ')}</small>
                    </span>
                  </button>
                  {e.kids.length > 0 && (
                    <p className="place-kids">
                      <span className="muted small">{e.wife ? 'যাঁদের নানাবাড়ি:' : 'যাঁদের দাদাবাড়ি:'}</span>
                      {e.kids.map(k => <button key={k.id} className="chip" onClick={() => open(k.id)}><Avatar m={k} size={22} />{k.name}</button>)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}

      {isAdmin && missing.length > 0 && (
        <div className="card">
          <h3>ঠিকানা বাকি · {bn(missing.length)} জন</h3>
          <p className="muted small">এঁদের বাবার বাড়ির ঠিকানা এখনো দেওয়া হয়নি। নামে চাপুন, তারপর সম্পাদনা থেকে যোগ করুন।</p>
          <p className="tags">{missing.map(m => <button key={m.id} className="chip" onClick={() => open(m.id)}><Avatar m={m} size={22} />{m.name}</button>)}</p>
        </div>
      )}
    </div>
  )
}
