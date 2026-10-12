import { useEffect, useRef, useState } from 'react'
import { sb, uploadPhoto } from '../supabase'
import { useApp } from '../ctx'
import { fmtDate, honor, bn, birthYear, deathYear } from '../lib/util'
import Avatar from './Avatar'

// একজন সদস্যের পেইজ
export default function MemberSheet({ id }) {
  const c = useApp()
  const { fam, uid, isAdmin, session } = c
  const m = fam.byId.get(id)
  const [phone, setPhone] = useState(null)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    setPhone(null)
    if (session && m)
      sb.from('member_private').select('phone').eq('member_id', id).maybeSingle()
        .then(({ data }) => setPhone(data?.phone || null))
  }, [id, session]) // eslint-disable-line

  if (!m) return <p className="muted">এই সদস্যকে পাওয়া যায়নি। হয়তো এখনো অনুমোদন হয়নি, অথবা লগইন করতে হবে।</p>

  const f = fam.byId.get(m.father_id), mo = fam.byId.get(m.mother_id)
  const nana = mo && !mo.in_lineage ? fam.byId.get(mo.father_id) : null
  const sps = fam.spouses(id), kids = fam.kids(id)
  const sibs = f || mo ? fam.kids((f || mo).id).filter(k => k.id !== id) : []
  const canEdit = isAdmin || (uid && m.user_id === uid)
  const myClaim = c.claims.find(x => x.member_id === id)
  const canClaim = session && !c.me && !m.user_id && !myClaim && m.status === 'approved'
  const code = fam.code(m)

  const Chip = ({ p }) => (
    <button className="chip" onClick={() => c.open(p.id)}><Avatar m={p} size={24} />{p.name}</button>
  )
  const Row = ({ l, children }) => children ? <div className="row"><span>{l}</span><div>{children}</div></div> : null

  async function act(label, fn) {
    setBusy(label)
    try { await fn() } catch (e) { alert(e.message) }
    setBusy('')
  }
  const approve = () => act('ap', async () => {
    const { error } = await sb.from('members').update({ status: 'approved' }).eq('id', id)
    if (error) throw error
    await c.reload()
  })
  const remove = () => {
    if (!confirm(`${m.name}-কে মুছে ফেলবেন? (ইতিহাস থেকে পরে ফিরিয়ে আনা যাবে)`)) return
    act('rm', async () => {
      const { error } = await sb.from('members').delete().eq('id', id)
      if (error) throw error
      c.close(); await c.reload()
    })
  }
  const claim = () => act('cl', async () => {
    const { error } = await sb.from('claims').insert({ member_id: id })
    if (error) throw error
    await c.reloadClaims()
    alert('দাবি পাঠানো হয়েছে। এডমিন অনুমোদন দিলে এটা আপনার পেইজ হবে।')
  })
  const photo = e => {
    const file = e.target.files[0]
    if (!file) return
    act('ph', async () => {
      const url = await uploadPhoto(id, file)
      const { error } = await sb.from('members').update({ photo_url: url }).eq('id', id)
      if (error) throw error
      await c.reload()
    })
  }
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/m/${id}`
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { prompt('লিংক কপি করুন:', url) }
  }

  const born = m.birth_date ? fmtDate(m.birth_date) : birthYear(m) ? `${bn(birthYear(m))} সাল` : null
  const died = m.death_date ? fmtDate(m.death_date) : deathYear(m) ? `${bn(deathYear(m))} সাল` : null

  return (
    <div className="profile">
      <div className="p-head">
        <span className="ring big"><Avatar m={m} size={104} /></span>
        <div>
          {code && <span className="code">বংশ নম্বর {code}</span>}
          <h2>{honor(m)}</h2>
          {m.nick_name && <p className="muted">ডাকনাম: {m.nick_name}</p>}
          {m.status === 'pending' && <p className="badge">⏳ এডমিনের অনুমোদনের অপেক্ষায়</p>}
          {!m.in_lineage && <p className="badge soft">বাইরের পরিবার থেকে আত্মীয়</p>}
        </div>
      </div>

      {m.bio && <p className="bio">{m.bio}</p>}

      <div className="rows">
        <Row l="বাবা">{f && <Chip p={f} />}</Row>
        <Row l="মা">{mo && <Chip p={mo} />}</Row>
        <Row l="মায়ের বংশ">{nana && <>নানা: <Chip p={nana} /></>}</Row>
        <Row l={m.gender === 'female' ? 'স্বামী' : 'স্ত্রী'}>{sps.length > 0 && sps.map(p => <Chip key={p.id} p={p} />)}</Row>
        <Row l="সন্তান">{kids.length > 0 && <><small className="muted">{fam.kidCount(id)}</small><br />{kids.map(p => <Chip key={p.id} p={p} />)}</>}</Row>
        <Row l="ভাই-বোন">{sibs.length > 0 && sibs.map(p => <Chip key={p.id} p={p} />)}</Row>
        <Row l="জন্ম">{born}</Row>
        <Row l="মৃত্যু">{died}</Row>
        <Row l="পেশা">{m.occupation}</Row>
        <Row l="ঠিকানা">{m.address}</Row>
        <Row l="ফোন">{phone && <a href={`tel:${phone}`}>{phone}</a>}</Row>
        {m.is_deceased && m.dua_count > 0 && <Row l="দোয়া">🤲 {bn(m.dua_count)} বার</Row>}
      </div>

      <div className="actions">
        {canEdit && <button className="btn" onClick={() => c.edit(id)}>✏️ সম্পাদনা</button>}
        {canEdit && <>
          <button className="btn soft" disabled={busy === 'ph'} onClick={() => fileRef.current.click()}>{busy === 'ph' ? 'আপলোড হচ্ছে…' : '📷 ছবি দিন'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={photo} />
        </>}
        {session && <button className="btn soft" onClick={() => c.addNew({
          father_id: m.gender === 'male' && m.in_lineage ? id : null,
          mother_id: m.gender === 'female' ? id : null,
        })}>➕ সন্তান যোগ করুন</button>}
        {canClaim && <button className="btn pink" disabled={busy === 'cl'} onClick={claim}>🙋 এটা আমি</button>}
        {myClaim?.status === 'pending' && <span className="badge">আপনার দাবি অনুমোদনের অপেক্ষায়</span>}
        {isAdmin && m.status === 'pending' && <button className="btn pink" disabled={busy === 'ap'} onClick={approve}>✓ অনুমোদন দিন</button>}
        <button className="btn soft" onClick={share}>{copied ? '✓ লিংক কপি হয়েছে' : '🔗 লিংক কপি'}</button>
        {kids.length > 0 && <a className="btn soft" href={`#/family/${id}`} onClick={c.close}>🖨️ পারিবারিক বিবরণ</a>}
        {isAdmin && <button className="btn danger" disabled={busy === 'rm'} onClick={remove}>মুছুন</button>}
      </div>
      {!session && <p className="muted small">নিজের পেইজ সাজাতে বা নতুন সদস্য যোগ করতে <button className="link" onClick={c.login}>লগইন করুন</button>।</p>}
    </div>
  )
}
