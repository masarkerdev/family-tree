import { useEffect, useMemo, useState } from 'react'
import { sb, uploadAlbumImage } from '../supabase'
import { useApp } from '../ctx'
import { bn } from '../lib/util'
import Avatar from '../components/Avatar'
import PersonPicker from '../components/PersonPicker'
import Sheet from '../components/Sheet'

// কয়েকজন মানুষ বেছে নেওয়া (ছবিতে কে কে আছেন)
function TagPicker({ value, onChange }) {
  const { fam } = useApp()
  return (
    <div>
      {value.length > 0 && (
        <p className="tags">{value.map(id => fam.byId.get(id)).filter(Boolean).map(m => (
          <span key={m.id} className="chip"><Avatar m={m} size={22} />{m.name}
            <button type="button" className="x" aria-label="সরান" onClick={() => onChange(value.filter(x => x !== m.id))}>✕</button>
          </span>
        ))}</p>
      )}
      <PersonPicker value={null} onChange={id => !value.includes(id) && onChange([...value, id])} filter={m => !value.includes(m.id)} placeholder="ছবিতে কে কে আছেন? নাম লিখুন…" />
    </div>
  )
}

function Upload({ onDone }) {
  const { isAdmin, reloadPhotos, uid } = useApp()
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [year, setYear] = useState('')
  const [tags, setTags] = useState([])
  const [busy, setBusy] = useState('')
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews])

  async function save(e) {
    e.preventDefault()
    if (!files.length) return alert('অন্তত একটি ছবি বেছে নিন')
    try {
      for (let i = 0; i < files.length; i++) {
        setBusy(`আপলোড হচ্ছে ${bn(i + 1)}/${bn(files.length)}…`)
        const { url, path } = await uploadAlbumImage(files[i])
        const { data, error } = await sb.from('photos').insert({
          url, path, caption: caption.trim() || null, year: year ? +year : null,
          uploaded_by: uid, status: isAdmin ? 'approved' : 'pending',
        }).select('id').single()
        if (error) throw error
        if (tags.length) {
          const r = await sb.from('photo_tags').insert(tags.map(member_id => ({ photo_id: data.id, member_id })))
          if (r.error) throw r.error
        }
      }
      await reloadPhotos()
      if (!isAdmin) alert('ধন্যবাদ! এডমিন অনুমোদন দিলে ছবিগুলো সবাই দেখতে পাবেন।')
      onDone()
    } catch (err) { alert(err.message) }
    setBusy('')
  }

  return (
    <form className="form" onSubmit={save}>
      <h2>ছবি যোগ করুন</h2>
      {!isAdmin && <p className="note">আপনার দেওয়া ছবি এডমিন দেখে অনুমোদন দিলে তবেই সবাই দেখতে পাবেন।</p>}
      <label className="drop">
        <input type="file" accept="image/*" multiple onChange={e => setFiles([...e.target.files])} />
        <span>{files.length ? `${bn(files.length)}টি ছবি বাছা হয়েছে · আবার বাছতে চাপুন` : '📷 ছবি বাছতে চাপুন (একসাথে কয়েকটি বাছা যায়)'}</span>
      </label>
      {previews.length > 0 && <div className="up-prev">{previews.map((u, i) => <img key={i} src={u} alt="" />)}</div>}
      <label>ছবির বর্ণনা<input value={caption} onChange={e => setCaption(e.target.value)} placeholder="যেমন: ঈদের দিন বাড়ির উঠানে সবাই" /></label>
      <label>কোন সালের ছবি (আনুমানিক)<input type="number" min="1850" max="2200" value={year} onChange={e => setYear(e.target.value)} /></label>
      <label>ছবিতে যাঁরা আছেন<TagPicker value={tags} onChange={setTags} /></label>
      <div className="actions">
        <button className="btn" disabled={!!busy}>{busy || 'আপলোড করুন'}</button>
        <button type="button" className="btn soft" onClick={onDone} disabled={!!busy}>বাতিল</button>
      </div>
    </form>
  )
}

function Lightbox({ list, index, onIndex, onClose }) {
  const c = useApp()
  const { fam, isAdmin, uid, reloadPhotos } = c
  const p = list[index]
  const [edit, setEdit] = useState(false)
  const [caption, setCaption] = useState('')
  const [year, setYear] = useState('')
  const [tags, setTags] = useState([])
  const [ask, setAsk] = useState(false)
  useEffect(() => { setEdit(false); setAsk(false) }, [index])
  useEffect(() => {
    const k = e => {
      if (edit) return
      if (e.key === 'ArrowRight') onIndex(Math.min(list.length - 1, index + 1))
      if (e.key === 'ArrowLeft') onIndex(Math.max(0, index - 1))
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [index, list.length, edit, onIndex])
  if (!p) return null
  const mine = isAdmin || p.uploaded_by === uid

  const startEdit = () => { setCaption(p.caption || ''); setYear(p.year || ''); setTags(p.tags); setEdit(true) }
  async function save() {
    const { error } = await sb.from('photos').update({ caption: caption.trim() || null, year: year ? +year : null }).eq('id', p.id)
    if (error) return alert(error.message)
    const add = tags.filter(t => !p.tags.includes(t)), rem = p.tags.filter(t => !tags.includes(t))
    if (rem.length) await sb.from('photo_tags').delete().eq('photo_id', p.id).in('member_id', rem)
    if (add.length) await sb.from('photo_tags').insert(add.map(member_id => ({ photo_id: p.id, member_id })))
    await reloadPhotos(); setEdit(false)
  }
  async function approve() {
    const { error } = await sb.from('photos').update({ status: 'approved' }).eq('id', p.id)
    if (error) return alert(error.message)
    reloadPhotos()
  }
  async function remove() {
    const { error } = await sb.from('photos').delete().eq('id', p.id)
    if (error) return alert(error.message)
    if (p.path) await sb.storage.from('photos').remove([p.path])
    await reloadPhotos()
    if (list.length <= 1) onClose(); else onIndex(Math.max(0, index - 1))
  }

  return (
    <Sheet onClose={onClose} wide>
      <div className="lb">
        <div className="lb-img">
          <img src={p.url} alt={p.caption || 'পারিবারিক ছবি'} />
          {index > 0 && <button className="lb-nav prev" aria-label="আগের ছবি" onClick={() => onIndex(index - 1)}>‹</button>}
          {index < list.length - 1 && <button className="lb-nav next" aria-label="পরের ছবি" onClick={() => onIndex(index + 1)}>›</button>}
        </div>
        <p className="muted small">{bn(index + 1)} / {bn(list.length)}</p>
        {!edit ? (
          <>
            {p.status === 'pending' && <p className="badge">⏳ এডমিনের অনুমোদনের অপেক্ষায়</p>}
            {p.caption && <h3>{p.caption}</h3>}
            {p.year && <p className="muted">{bn(p.year)} সাল</p>}
            {p.tags.length > 0 && (
              <p className="tags">ছবিতে আছেন: {p.tags.map(id => fam.byId.get(id)).filter(Boolean).map(m => (
                <button key={m.id} className="chip" onClick={() => c.open(m.id)}><Avatar m={m} size={22} />{m.name}</button>
              ))}</p>
            )}
            <div className="actions">
              {isAdmin && p.status === 'pending' && <button className="btn pink" onClick={approve}>✓ অনুমোদন দিন</button>}
              {mine && <button className="btn soft" onClick={startEdit}>✏️ বর্ণনা ও নাম বদলান</button>}
              {mine && !ask && <button className="btn danger" onClick={() => setAsk(true)}>মুছুন</button>}
              {mine && ask && <><span>সত্যিই মুছবেন?</span><button className="btn danger" onClick={remove}>হ্যাঁ, মুছুন</button><button className="btn soft" onClick={() => setAsk(false)}>না</button></>}
            </div>
          </>
        ) : (
          <div className="form">
            <label>ছবির বর্ণনা<input value={caption} onChange={e => setCaption(e.target.value)} /></label>
            <label>কোন সালের ছবি<input type="number" value={year} onChange={e => setYear(e.target.value)} /></label>
            <label>ছবিতে যাঁরা আছেন<TagPicker value={tags} onChange={setTags} /></label>
            <div className="actions"><button className="btn" onClick={save}>সংরক্ষণ করুন</button><button className="btn soft" onClick={() => setEdit(false)}>বাতিল</button></div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export default function Album({ photoId }) {
  const { photos, albumReady, session, isAdmin, login, fam } = useApp()
  const [who, setWho] = useState(null)
  const [up, setUp] = useState(false)
  const [idx, setIdx] = useState(-1)
  const [tab, setTab] = useState('all')

  const pending = photos.filter(p => p.status === 'pending')
  const list = useMemo(() => {
    let l = tab === 'pending' ? pending : photos.filter(p => p.status === 'approved' || !isAdmin)
    if (who) l = l.filter(p => p.tags.includes(who))
    return l
  }, [photos, who, tab, isAdmin]) // eslint-disable-line

  // সাল ধরে ভাগ করা
  const groups = useMemo(() => {
    const g = new Map()
    list.forEach((p, i) => { const k = p.year ? Math.floor(p.year / 10) * 10 : 0; if (!g.has(k)) g.set(k, []); g.get(k).push({ p, i }) })
    return [...g.entries()].sort((a, b) => b[0] - a[0])
  }, [list])

  useEffect(() => { if (photoId) { const i = list.findIndex(p => p.id === photoId); if (i >= 0) setIdx(i) } }, [photoId, list.length]) // eslint-disable-line

  if (!albumReady) return (
    <div className="inner">
      <h1 className="page-title">অ্যালবাম</h1>
      <div className="card"><p>অ্যালবাম এখনো চালু হয়নি। এডমিন Supabase-এর SQL Editor-এ <code>album.sql</code> একবার চালালেই চালু হবে।</p></div>
    </div>
  )

  return (
    <div className="inner album">
      <h1 className="page-title">অ্যালবাম</h1>
      <p className="muted">পরিবারের পুরনো ও নতুন ছবি। ছবিতে চাপলে বড় হবে, কে কে আছেন দেখা যাবে।</p>
      <div className="toolbar">
        <div className="tb-pick">
          <PersonPicker value={who} onChange={setWho} placeholder="কারো ছবি খুঁজুন…" />
        </div>
        {session
          ? <button className="btn" onClick={() => setUp(true)}>＋ ছবি যোগ করুন</button>
          : <button className="btn soft" onClick={login}>ছবি দিতে লগইন করুন</button>}
      </div>
      {isAdmin && pending.length > 0 && (
        <div className="toolbar">
          <button className={'btn sm' + (tab === 'all' ? '' : ' soft')} onClick={() => setTab('all')}>সব ছবি</button>
          <button className={'btn sm' + (tab === 'pending' ? ' pink' : ' soft')} onClick={() => setTab('pending')}>অনুমোদনের অপেক্ষায় ({bn(pending.length)})</button>
        </div>
      )}
      {who && <p className="small">{fam.byId.get(who)?.name}-এর ছবি: {bn(list.length)}টি</p>}

      {!list.length ? (
        <div className="card empty">
          <p>{who ? 'এঁর কোনো ছবি এখনো নেই।' : 'এখনো কোনো ছবি নেই। প্রথম ছবিটি আপনিই দিন: পুরনো সাদাকালো ছবি, ঈদ বা বিয়ের ছবি, গ্রামের বাড়ির ছবি।'}</p>
        </div>
      ) : groups.map(([dec, items]) => (
        <section key={dec}>
          <h2 className="sec">{dec ? `${bn(dec)}-এর দশক` : 'সাল জানা নেই'}</h2>
          <div className="gallery">
            {items.map(({ p, i }) => (
              <button key={p.id} className={'ph' + (p.status === 'pending' ? ' pend' : '')} onClick={() => setIdx(i)}>
                <img src={p.url} alt={p.caption || 'পারিবারিক ছবি'} loading="lazy" />
                {(p.caption || p.tags.length > 0) && <span className="ph-cap">{p.caption || `${bn(p.tags.length)} জন`}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      {up && <Sheet onClose={() => setUp(false)}><Upload onDone={() => setUp(false)} /></Sheet>}
      {idx >= 0 && <Lightbox list={list} index={idx} onIndex={setIdx} onClose={() => { setIdx(-1); if (photoId) location.hash = '#/album' }} />}
    </div>
  )
}
