import { useEffect, useState } from 'react'
import { sb } from '../supabase'
import { useApp } from '../ctx'
import PersonPicker from './PersonPicker'

const EMPTY = {
  name: '', nick_name: '', gender: 'male', in_lineage: true, father_id: null, mother_id: null, sort_order: 0,
  birth_year: '', birth_date: '', is_deceased: false, death_year: '', death_date: '',
  occupation: '', address: '', bio: '',
}

// সদস্য যোগ বা সম্পাদনা
export default function MemberForm({ id, preset }) {
  const c = useApp()
  const { fam, isAdmin, uid } = c
  const orig = id ? fam.byId.get(id) : null
  const [f, setF] = useState(() => {
    const base = { ...EMPTY, ...(orig || {}), ...(preset || {}) }
    for (const k of Object.keys(EMPTY)) if (base[k] === null && typeof EMPTY[k] === 'string') base[k] = ''
    return base
  })
  const [phone, setPhone] = useState('')
  const [spouse, setSpouse] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const isNew = !id
  const canTree = isAdmin || isNew          // সাধারণ সদস্য শুধু নতুন যোগ করার সময় বাবা-মা বেছে নিতে পারেন
  const canPhone = id && (isAdmin || (orig && orig.user_id === uid))
  const marriages = id ? fam.spouses(id) : []

  useEffect(() => {
    if (canPhone)
      sb.from('member_private').select('phone').eq('member_id', id).maybeSingle()
        .then(({ data }) => setPhone(data?.phone || ''))
  }, [id]) // eslint-disable-line

  // বাবা বাছলে মা, আর মা বাছলে বাবা নিজে থেকে বসে যায়।
  // উৎস: (১) বিয়ের সম্পর্ক, (২) তাঁর অন্য সন্তানদের বাবা/মা — দুটো মিলিয়ে একজনই পাওয়া গেলে বসিয়ে দেয়
  const uniq = arr => [...new Set(arr.filter(Boolean))]
  const motherOptions = f.father_id ? uniq([
    ...fam.spouses(f.father_id).map(w => w.id),
    ...fam.kids(f.father_id).filter(k => k.id !== id && k.father_id === f.father_id).map(k => k.mother_id),
  ]).map(x => fam.byId.get(x)).filter(Boolean) : []
  const fatherOptions = f.mother_id ? uniq([
    ...fam.spouses(f.mother_id).map(h => h.id),
    ...fam.kids(f.mother_id).filter(k => k.id !== id && k.mother_id === f.mother_id).map(k => k.father_id),
  ]).map(x => fam.byId.get(x)).filter(Boolean) : []
  useEffect(() => {
    if (f.father_id && !f.mother_id && motherOptions.length === 1) set('mother_id', motherOptions[0].id)
  }, [f.father_id, motherOptions.length]) // eslint-disable-line
  useEffect(() => {
    if (f.mother_id && !f.father_id && fatherOptions.length === 1) set('father_id', fatherOptions[0].id)
  }, [f.mother_id, fatherOptions.length]) // eslint-disable-line
  const married = (h, w) => fam.spouses(h).some(x => x.id === w)

  // তালিকায় না থাকা বাবা/মা/স্বামী/স্ত্রীকে সেখান থেকেই যোগ করা (বাইরের পরিবারের মানুষ হিসেবে)
  async function quickAdd(name, gender, partnerId) {
    const { data, error } = await sb.from('members')
      .insert({ name, gender, in_lineage: false, status: isAdmin ? 'approved' : 'pending' })
      .select('id').single()
    if (error) throw error
    if (isAdmin && partnerId) {
      const pair = gender === 'female' ? { husband_id: partnerId, wife_id: data.id } : { husband_id: data.id, wife_id: partnerId }
      const r = await sb.from('marriages').insert(pair)
      if (r.error) throw r.error
    }
    await c.reload()
    return data.id
  }

  async function save(e) {
    e.preventDefault()
    if (!f.name.trim()) return alert('নাম দিন')
    if (id && (f.father_id === id || f.mother_id === id || fam.descendants(id).has(f.father_id) || fam.descendants(id).has(f.mother_id)))
      return alert('কেউ নিজের বা নিজের বংশধরের সন্তান হতে পারেন না। বাবা/মা আবার দেখুন।')
    const num = v => (v === '' || v == null ? null : +v)
    const row = {
      name: f.name.trim(), nick_name: f.nick_name || null, gender: f.gender,
      birth_date: f.birth_date || null,
      birth_year: f.birth_date ? +f.birth_date.slice(0, 4) : num(f.birth_year),
      is_deceased: f.is_deceased,
      death_date: f.is_deceased ? f.death_date || null : null,
      death_year: f.is_deceased ? (f.death_date ? +f.death_date.slice(0, 4) : num(f.death_year)) : null,
      occupation: f.occupation || null, address: f.address || null, bio: f.bio || null,
    }
    if (canTree) Object.assign(row, { father_id: f.father_id, mother_id: f.mother_id })
    if (isAdmin) Object.assign(row, { in_lineage: f.in_lineage, sort_order: num(f.sort_order) || 0 })

    setBusy(true)
    try {
      let mid = id
      if (isNew) {
        row.status = isAdmin ? 'approved' : 'pending'
        if (preset?.self) row.user_id = uid
        const { data, error } = await sb.from('members').insert(row).select('id').single()
        if (error) throw error
        mid = data.id
      } else {
        const { error } = await sb.from('members').update(row).eq('id', id)
        if (error) throw error
      }
      if (canPhone) {
        const { error } = await sb.from('member_private').upsert({ member_id: mid, phone: phone || null })
        if (error) throw error
      }
      // বাবা ও মা দুজনই দেওয়া থাকলে তাঁদের স্বামী-স্ত্রী হিসেবে জুড়ে দেয়, পরের সন্তানে মা নিজে থেকে আসবে
      if (isAdmin && canTree && f.father_id && f.mother_id && !married(f.father_id, f.mother_id)) {
        const { error } = await sb.from('marriages').insert({ husband_id: f.father_id, wife_id: f.mother_id })
        if (error && error.code !== '23505') throw error
      }
      if (isAdmin && spouse) {
        const pair = f.gender === 'female' ? { husband_id: spouse, wife_id: mid } : { husband_id: mid, wife_id: spouse }
        const { error } = await sb.from('marriages').insert(pair)
        if (error) throw error
      }
      await c.reload()
      if (isNew && !isAdmin) alert('ধন্যবাদ! এডমিন অনুমোদন দিলে সবাই দেখতে পাবেন।')
      c.open(mid)
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  async function unmarry(other) {
    if (!confirm(`${other.name}-এর সাথে বিয়ের সম্পর্কটি মুছবেন?`)) return
    const h = f.gender === 'female' ? other.id : id, w = f.gender === 'female' ? id : other.id
    const { error } = await sb.from('marriages').delete().eq('husband_id', h).eq('wife_id', w)
    if (error) return alert(error.message)
    await c.reload()
  }

  return (
    <form className="form" onSubmit={save}>
      <h2>{isNew ? (preset?.self ? 'আমার পেইজ তৈরি করুন' : 'নতুন সদস্য যোগ') : `${orig?.name} — সম্পাদনা`}</h2>
      {isNew && !isAdmin && <p className="note">আপনি যা যোগ করবেন, এডমিন দেখে অনুমোদন দিলে তবেই সবাই দেখতে পাবেন।</p>}

      <label>নাম *<input value={f.name} onChange={e => set('name', e.target.value)} required /></label>
      <div className="two-col">
        <label>ডাকনাম<input value={f.nick_name} onChange={e => set('nick_name', e.target.value)} /></label>
        <label>লিঙ্গ
          <select value={f.gender} onChange={e => set('gender', e.target.value)}>
            <option value="male">পুরুষ</option><option value="female">নারী</option>
          </select>
        </label>
      </div>

      {canTree ? (
        <fieldset>
          <legend>বাবা-মা</legend>
          <label>বাবা<PersonPicker value={f.father_id} onChange={v => set('father_id', v)} filter={m => m.id !== id && (m.gender !== 'female' || !m.in_lineage)}
            onCreate={name => quickAdd(name, 'male', f.mother_id)} createLabel="তালিকায় নেই এমন বাবা, যেমন জামাই (বাইরের পরিবার হিসেবে যোগ হবে)" /></label>
          <label>মা<PersonPicker value={f.mother_id} onChange={v => set('mother_id', v)} filter={m => m.id !== id && (m.gender !== 'male' || !m.in_lineage)}
            onCreate={name => quickAdd(name, 'female', f.father_id)} createLabel={f.father_id ? `বাইরের পরিবার থেকে আসা মা হিসেবে যোগ হবে, ${fam.byId.get(f.father_id)?.name}-এর স্ত্রী হিসেবেও জুড়ে যাবে` : 'বাইরের পরিবার থেকে আসা মা হিসেবে যোগ হবে'} /></label>
          {!f.mother_id && motherOptions.length > 1 && (
            <p className="small">মা কে? {motherOptions.map(w => <button type="button" key={w.id} className="chip" onClick={() => set('mother_id', w.id)}>{w.name}</button>)}</p>
          )}
          {!f.father_id && fatherOptions.length > 1 && (
            <p className="small">বাবা কে? {fatherOptions.map(h => <button type="button" key={h.id} className="chip" onClick={() => set('father_id', h.id)}>{h.name}</button>)}</p>
          )}
          <p className="muted small">তালিকায় না থাকলে নাম লিখে "নতুন হিসেবে যোগ করুন" চাপুন। মেয়ের ঘরের সন্তান হলে মা হিসেবে বংশের মেয়েকে বেছে নিন, বাবা হিসেবে জামাইয়ের নাম লিখে যোগ করুন।</p>
        </fieldset>
      ) : <p className="muted small">বাবা-মা বা বংশের কাঠামো শুধু এডমিন বদলাতে পারেন।</p>}

      {isAdmin && (
        <fieldset>
          <legend>এডমিনের জন্য</legend>
          <label className="check"><input type="checkbox" checked={!f.in_lineage} onChange={e => set('in_lineage', !e.target.checked)} />
            বাইরের পরিবারের মানুষ (বউমা, জামাই, নানাবাড়ির লোক)</label>
          <label>ভাই-বোনের মধ্যে ক্রম (১ = বড়)<input type="number" min="0" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} /></label>
          <label>{f.gender === 'female' ? 'স্বামী' : 'স্ত্রী'} যোগ করুন
            <PersonPicker value={spouse} onChange={setSpouse} filter={m => m.gender !== f.gender && m.id !== id && !marriages.some(s => s.id === m.id)} placeholder="নাম লিখে খুঁজুন…"
              onCreate={id ? async name => { await quickAdd(name, f.gender === 'female' ? 'male' : 'female', id); return null } : name => quickAdd(name, f.gender === 'female' ? 'male' : 'female', null)}
              createLabel="বাইরের পরিবারের মানুষ হিসেবে যোগ হবে" />
          </label>
          {marriages.length > 0 && <p className="small">বর্তমান: {marriages.map(s => <span key={s.id} className="chip">{s.name} <button type="button" className="x" onClick={() => unmarry(s)}>✕</button></span>)}</p>}
        </fieldset>
      )}

      <fieldset>
        <legend>জন্ম ও মৃত্যু</legend>
        <div className="two-col">
          <label>জন্ম তারিখ<input type="date" value={f.birth_date} onChange={e => set('birth_date', e.target.value)} /></label>
          <label>শুধু সাল জানা থাকলে<input type="number" min="1700" max="2200" value={f.birth_date ? '' : f.birth_year} disabled={!!f.birth_date} onChange={e => set('birth_year', e.target.value)} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={f.is_deceased} onChange={e => set('is_deceased', e.target.checked)} /> প্রয়াত</label>
        {f.is_deceased && (
          <div className="two-col">
            <label>মৃত্যুর তারিখ<input type="date" value={f.death_date} onChange={e => set('death_date', e.target.value)} /></label>
            <label>শুধু সাল জানা থাকলে<input type="number" min="1700" max="2200" value={f.death_date ? '' : f.death_year} disabled={!!f.death_date} onChange={e => set('death_year', e.target.value)} /></label>
          </div>
        )}
      </fieldset>

      <div className="two-col">
        <label>পেশা<input value={f.occupation} onChange={e => set('occupation', e.target.value)} /></label>
        <label>বর্তমান ঠিকানা (এলাকা)<input value={f.address} onChange={e => set('address', e.target.value)} /></label>
      </div>
      {canPhone && <label>ফোন (শুধু লগইন করা সদস্যরা দেখবেন)<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></label>}
      <label>জীবনী ও গল্প<textarea rows="5" value={f.bio} onChange={e => set('bio', e.target.value)}
        placeholder="তিনি কেমন মানুষ ছিলেন, কী করতেন, তাঁর কোনো মজার বা শিক্ষণীয় ঘটনা… এই গল্পগুলোই খেলায় প্রশ্ন হয়ে আসবে।" /></label>

      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}</button>
        <button type="button" className="btn soft" onClick={() => (id ? c.open(id) : c.close())}>বাতিল</button>
      </div>
    </form>
  )
}
