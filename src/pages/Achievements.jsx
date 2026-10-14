import { useCallback, useEffect, useMemo, useState } from 'react'
import { sb, uploadImage } from '../supabase'
import { useApp } from '../ctx'
import { bn } from '../lib/util'
import Avatar from '../components/Avatar'
import PersonPicker from '../components/PersonPicker'
import Sheet from '../components/Sheet'

// অর্জন বোর্ড — পরীক্ষার ফল, চাকরি, পুরস্কার, খেলাধুলা, হাফেজ হওয়া…
export const CATS = [
  ['edu', '🎓', 'পড়াশোনা'],
  ['job', '💼', 'চাকরি ও পেশা'],
  ['award', '🏅', 'পুরস্কার'],
  ['sports', '⚽', 'খেলাধুলা'],
  ['religion', '🕌', 'দ্বীনি'],
  ['other', '⭐', 'অন্যান্য'],
]
export const CAT = Object.fromEntries(CATS.map(([k, i, l]) => [k, { i, l }]))

const EXAMPLES = {
  edu: 'যেমন: এসএসসিতে জিপিএ ৫', job: 'যেমন: বিসিএস (কৃষি) ক্যাডারে যোগদান', award: 'যেমন: জেলা পর্যায়ে সেরা শিক্ষক',
  sports: 'যেমন: স্কুল ক্রিকেট টুর্নামেন্টে চ্যাম্পিয়ন', religion: 'যেমন: পবিত্র কুরআনের হাফেজ হলেন', other: 'যেমন: প্রথম বই প্রকাশ',
}

function AchForm({ item, onDone }) {
  const { isAdmin, uid, me } = useApp()
  const [f, setF] = useState(() => item
    ? { member_id: item.member_id, category: item.category, title: item.title, detail: item.detail || '', year: item.year || '' }
    : { member_id: me?.id || null, category: 'edu', title: '', detail: '', year: new Date().getFullYear() })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function save(e) {
    e.preventDefault()
    if (!f.member_id) return alert('কার অর্জন, তা বেছে নিন')
    if (!f.title.trim()) return alert('অর্জনের শিরোনাম লিখুন')
    setBusy(true)
    try {
      const row = { member_id: f.member_id, category: f.category, title: f.title.trim(), detail: f.detail.trim() || null, year: f.year ? +f.year : null }
      if (file) row.photo_url = (await uploadImage(file, 'achievements', 1200)).url
      const r = item
        ? await sb.from('achievements').update(row).eq('id', item.id)
        : await sb.from('achievements').insert({ ...row, created_by: uid, status: isAdmin ? 'approved' : 'pending' })
      if (r.error) throw r.error
      if (!item && !isAdmin) alert('ধন্যবাদ! এডমিন অনুমোদন দিলে সবাই দেখতে পাবেন।')
      onDone(true)
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  return (
    <form className="form" onSubmit={save}>
      <h2>{item ? 'অর্জন সম্পাদনা' : '🏆 নতুন অর্জন'}</h2>
      {!item && !isAdmin && <p className="note">এডমিন দেখে অনুমোদন দিলে তবেই সবাই দেখতে পাবেন।</p>}
      <label>কার অর্জন? *<PersonPicker value={f.member_id} onChange={v => set('member_id', v)} placeholder="নাম লিখে খুঁজুন…" /></label>
      <div className="seg kind-seg" role="radiogroup" aria-label="ধরন">
        {CATS.map(([k, i, l]) => (
          <button type="button" key={k} role="radio" aria-checked={f.category === k} className={f.category === k ? 'on' : ''} onClick={() => set('category', k)}>{i} {l}</button>
        ))}
      </div>
      <label>অর্জন *<input required value={f.title} onChange={e => set('title', e.target.value)} placeholder={EXAMPLES[f.category]} /></label>
      <label>বিস্তারিত<textarea rows="3" value={f.detail} onChange={e => set('detail', e.target.value)} placeholder="কোন প্রতিষ্ঠান, কোথায়, কেমন লাগল…" /></label>
      <div className="two-col">
        <label>সাল<input type="number" min="1800" max="2200" value={f.year} onChange={e => set('year', e.target.value)} /></label>
        <label>ছবি (ঐচ্ছিক)<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)} /></label>
      </div>
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : item ? 'সংরক্ষণ করুন' : 'যোগ করুন'}</button>
        <button type="button" className="btn soft" onClick={() => onDone(false)}>বাতিল</button>
      </div>
    </form>
  )
}

// একটি অর্জনের কার্ড (সদস্যের পেইজেও ব্যবহার হয়)
export function AchCard({ a, cheers = 0, mine = false, onCheer, onEdit, onRemove, onApprove, compact }) {
  const { fam, open } = useApp()
  const m = fam.byId.get(a.member_id)
  return (
    <article className={'card ach c-' + a.category + (compact ? ' compact' : '')}>
      <div className="ach-top">
        <span className="ach-ico" aria-hidden="true">{CAT[a.category].i}</span>
        <div className="ach-main">
          <small className="ach-cat">{CAT[a.category].l}{a.year ? ` · ${bn(a.year)}` : ''}{a.status === 'pending' ? ' · ⏳ অনুমোদনের অপেক্ষায়' : ''}</small>
          <h3>{a.title}</h3>
          {!compact && m && <button className="chip" onClick={() => open(m.id)}><Avatar m={m} size={24} />{m.name}</button>}
        </div>
      </div>
      {a.detail && <p className="ach-detail">{a.detail}</p>}
      {a.photo_url && <img className="ach-img" src={a.photo_url} alt="" loading="lazy" />}
      {(onCheer || onEdit || onApprove) && (
        <div className="actions">
          {onCheer && <button className={'btn sm cheer' + (mine ? ' on' : '')} onClick={onCheer} aria-pressed={mine}>🎉 অভিনন্দন{cheers ? ` · ${bn(cheers)}` : ''}</button>}
          {onApprove && <button className="btn sm" onClick={onApprove}>✓ অনুমোদন</button>}
          {onEdit && <button className="btn sm soft" onClick={onEdit}>✏️</button>}
          {onRemove && <button className="btn sm soft w-del" onClick={onRemove} aria-label="মুছুন">মুছুন</button>}
        </div>
      )}
    </article>
  )
}

// ডাটা আনা + অভিনন্দন — পেইজ আর সদস্যের পেইজ দুই জায়গাতেই কাজে লাগে
export function useAchievements(memberId) {
  const { uid } = useApp()
  const [list, setList] = useState(null)
  const [cheers, setCheers] = useState([])
  const [missing, setMissing] = useState(false)
  const load = useCallback(async () => {
    let q = sb.from('achievements').select('*').order('year', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    if (memberId) q = q.eq('member_id', memberId)
    const [a, c] = await Promise.all([q, sb.from('achievement_cheers').select('achievement_id,user_id')])
    if (a.error) { setMissing(true); return setList([]) }
    setList(a.data || []); setCheers(c.data || [])
  }, [memberId])
  useEffect(() => { if (uid) load(); else setList([]) }, [load, uid])
  const count = useMemo(() => {
    const m = new Map()
    for (const c of cheers) m.set(c.achievement_id, (m.get(c.achievement_id) || 0) + 1)
    return m
  }, [cheers])
  const mine = id => cheers.some(c => c.achievement_id === id && c.user_id === uid)
  const cheer = async id => {
    const r = mine(id)
      ? await sb.from('achievement_cheers').delete().eq('achievement_id', id).eq('user_id', uid)
      : await sb.from('achievement_cheers').insert({ achievement_id: id, user_id: uid })
    if (r.error) return alert(r.error.message)
    load()
  }
  return { list, missing, load, count, mine, cheer }
}

export default function Achievements() {
  const { isAdmin, uid, fam } = useApp()
  const { list, missing, load, count, mine, cheer } = useAchievements()
  const [cat, setCat] = useState('all')
  const [year, setYear] = useState('all')
  const [editing, setEditing] = useState(null)

  if (missing) return (
    <div className="inner">
      <h1 className="page-title">অর্জন বোর্ড</h1>
      <div className="card"><p>এই পেইজ চালু করতে এডমিন Supabase-এর SQL Editor-এ <code>leaderboard-achievements.sql</code> একবার চালাবেন।</p></div>
    </div>
  )

  const all = (list || []).filter(a => fam.byId.get(a.member_id))
  const pending = all.filter(a => a.status === 'pending')
  const visible = all.filter(a => a.status === 'approved' || a.created_by === uid)
  const years = [...new Set(visible.map(a => a.year).filter(Boolean))].sort((x, y) => y - x)
  const shown = visible.filter(a => (cat === 'all' || a.category === cat) && (year === 'all' || a.year === +year))
  const thisYear = new Date().getFullYear()
  const nThis = visible.filter(a => a.status === 'approved' && a.year === thisYear).length
  const people = new Set(visible.filter(a => a.status === 'approved').map(a => a.member_id)).size

  const approve = async a => {
    const { error } = await sb.from('achievements').update({ status: 'approved' }).eq('id', a.id)
    if (error) return alert(error.message)
    load()
  }
  const remove = async a => {
    if (!confirm(`"${a.title}" মুছে ফেলবেন?`)) return
    const { error } = await sb.from('achievements').delete().eq('id', a.id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div className="inner">
      <h1 className="page-title">অর্জন বোর্ড</h1>
      <p className="muted">পরিবারের যে কারো ভালো ফল, নতুন চাকরি, পুরস্কার, খেলায় জয়, হাফেজ হওয়া… সবার অর্জন এক জায়গায়। অভিনন্দন জানিয়ে উৎসাহ দিন! 🎉</p>

      <div className="stat-tiles three">
        <div className="stat"><b>{bn(visible.filter(a => a.status === 'approved').length)}</b><span>মোট অর্জন</span></div>
        <div className="stat"><b>{bn(people)}</b><span>জনের অর্জন</span></div>
        <div className="stat"><b>{bn(nThis)}</b><span>{bn(thisYear)} সালে</span></div>
      </div>

      <div className="w-top">
        <button className="btn" onClick={() => setEditing('new')}>🏆 নতুন অর্জন যোগ করুন</button>
        {years.length > 1 && (
          <select className="psel ach-year" value={year} onChange={e => setYear(e.target.value)} aria-label="সাল">
            <option value="all">সব সাল</option>
            {years.map(y => <option key={y} value={y}>{bn(y)}</option>)}
          </select>
        )}
      </div>

      <div className="seg w-tabs" role="tablist" aria-label="ধরন">
        <button role="tab" aria-selected={cat === 'all'} className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>সব</button>
        {CATS.map(([k, i, l]) => (
          <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{i} {l}</button>
        ))}
      </div>

      {isAdmin && pending.length > 0 && (
        <>
          <h2 className="sec">⏳ অনুমোদনের অপেক্ষায় · {bn(pending.length)}টি</h2>
          <div className="grid wide">
            {pending.map(a => <AchCard key={a.id} a={a} onApprove={() => approve(a)} onEdit={() => setEditing(a)} onRemove={() => remove(a)} />)}
          </div>
          <h2 className="sec">সব অর্জন</h2>
        </>
      )}

      {list === null ? <p className="muted">লোড হচ্ছে…</p> : shown.filter(a => a.status === 'approved' || !isAdmin).length ? (
        <div className="grid wide">
          {shown.filter(a => a.status === 'approved' || !isAdmin).map(a => (
            <AchCard key={a.id} a={a} cheers={count.get(a.id)} mine={mine(a.id)}
              onCheer={a.status === 'approved' ? () => cheer(a.id) : null}
              onEdit={isAdmin || a.created_by === uid ? () => setEditing(a) : null}
              onRemove={isAdmin || a.created_by === uid ? () => remove(a) : null} />
          ))}
        </div>
      ) : (
        <div className="card empty"><p>{cat !== 'all' || year !== 'all' ? 'এমন কোনো অর্জন পাওয়া যায়নি।' : 'এখনো কোনো অর্জন যোগ হয়নি। প্রথমটা আপনিই দিন!'}</p></div>
      )}

      {editing && (
        <Sheet onClose={() => setEditing(null)}>
          <AchForm item={editing === 'new' ? null : editing} onDone={changed => { setEditing(null); if (changed) load() }} />
        </Sheet>
      )}
    </div>
  )
}
