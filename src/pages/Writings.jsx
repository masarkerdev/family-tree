import { useCallback, useEffect, useMemo, useState } from 'react'
import { sb } from '../supabase'
import { useApp } from '../ctx'
import { bn, fmtDate } from '../lib/util'
import Avatar from '../components/Avatar'
import PersonPicker, { normName } from '../components/PersonPicker'
import Sheet from '../components/Sheet'

// গান, কবিতা ও গল্প — পরিবারের মানুষের লেখা এক জায়গায়
const KINDS = [
  ['song', '🎵', 'গান'],
  ['poem', '📜', 'কবিতা'],
  ['story', '📖', 'গল্প'],
  ['other', '✍️', 'অন্যান্য'],
]
const KIND = Object.fromEntries(KINDS.map(([k, i, l]) => [k, { i, l }]))

const authorOf = (w, fam) => {
  const m = w.author_id ? fam.byId.get(w.author_id) : null
  return { m, name: m ? m.name : w.author_name || 'অজানা' }
}

// লেখা যোগ বা সম্পাদনা
function WriteForm({ item, onDone }) {
  const { isAdmin, uid, me, fam } = useApp()
  const [f, setF] = useState(() => item
    ? { kind: item.kind, title: item.title, body: item.body, author_id: item.author_id, author_name: item.author_name || '' }
    : { kind: 'poem', title: '', body: '', author_id: me?.id || null, author_name: '' })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function save(e) {
    e.preventDefault()
    if (!f.title.trim() || !f.body.trim()) return alert('শিরোনাম ও লেখা দুটোই দিন')
    const row = {
      kind: f.kind, title: f.title.trim(), body: f.body.replace(/\s+$/, ''),
      author_id: f.author_id || null, author_name: f.author_id ? null : f.author_name.trim() || null,
    }
    setBusy(true)
    const r = item
      ? await sb.from('writings').update(row).eq('id', item.id)
      : await sb.from('writings').insert({ ...row, created_by: uid, status: isAdmin ? 'approved' : 'pending' })
    setBusy(false)
    if (r.error) return alert(r.error.message)
    if (!item && !isAdmin) alert('ধন্যবাদ! এডমিন অনুমোদন দিলে সবাই আপনার লেখা পড়তে পারবেন।')
    onDone(true)
  }

  return (
    <form className="form" onSubmit={save}>
      <h2>{item ? 'লেখা সম্পাদনা' : 'নতুন লেখা'}</h2>
      {!item && !isAdmin && <p className="note">আপনার লেখা এডমিন দেখে অনুমোদন দিলে তবেই সবাই পড়তে পারবেন। ততক্ষণ শুধু আপনি দেখবেন।</p>}
      <div className="seg kind-seg" role="radiogroup" aria-label="লেখার ধরন">
        {KINDS.map(([k, i, l]) => (
          <button type="button" key={k} role="radio" aria-checked={f.kind === k} className={f.kind === k ? 'on' : ''} onClick={() => set('kind', k)}>{i} {l}</button>
        ))}
      </div>
      <label>শিরোনাম *<input required value={f.title} onChange={e => set('title', e.target.value)} placeholder="যেমন: আমার গ্রাম অলুয়া" /></label>
      <label>লেখা *
        <textarea required rows="12" className="w-body" value={f.body} onChange={e => set('body', e.target.value)}
          placeholder={f.kind === 'story' ? 'গল্পটা লিখুন… দাদা-দাদি, নানা-নানির মুখে শোনা পুরনো দিনের কথাও লিখতে পারেন।' : 'প্রতিটি লাইন আলাদা লাইনে লিখুন…'} />
      </label>
      <fieldset>
        <legend>লেখক</legend>
        <label>বংশের কে লিখেছেন?
          <PersonPicker value={f.author_id} onChange={v => set('author_id', v)} placeholder="নাম লিখে খুঁজুন…" />
        </label>
        {!f.author_id && (
          <label>তালিকায় না থাকলে লেখকের নাম
            <input value={f.author_name} onChange={e => set('author_name', e.target.value)} placeholder="যেমন: সংগৃহীত, লোকগান, অজানা" />
          </label>
        )}
        {fam && !f.author_id && !f.author_name && <p className="muted small">লেখক না দিলে "অজানা" দেখাবে।</p>}
      </fieldset>
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : item ? 'সংরক্ষণ করুন' : 'প্রকাশ করুন'}</button>
        <button type="button" className="btn soft" onClick={() => onDone(false)}>বাতিল</button>
      </div>
    </form>
  )
}

// পুরো লেখা পড়া
function Reader({ w, hearts, mine, onHeart, onEdit, onChanged, onClose }) {
  const { fam, isAdmin, uid, open } = useApp()
  const a = authorOf(w, fam)
  const canEdit = isAdmin || w.created_by === uid
  const approve = async () => {
    const { error } = await sb.from('writings').update({ status: 'approved' }).eq('id', w.id)
    if (error) return alert(error.message)
    onChanged()
  }
  const remove = async () => {
    if (!confirm(`"${w.title}" মুছে ফেলবেন?`)) return
    const { error } = await sb.from('writings').delete().eq('id', w.id)
    if (error) return alert(error.message)
    onClose(); onChanged()
  }
  return (
    <Sheet onClose={onClose}>
      <article className={'reader k-' + w.kind}>
        <span className="w-kind">{KIND[w.kind].i} {KIND[w.kind].l}</span>
        <h2>{w.title}</h2>
        <p className="w-by">
          {a.m ? <button className="chip" onClick={() => open(a.m.id)}><Avatar m={a.m} size={24} />{a.name}</button> : <span className="muted">— {a.name}</span>}
          {w.created_at && <small className="muted">{fmtDate(String(w.created_at).slice(0, 10))}</small>}
        </p>
        {w.status === 'pending' && <p className="badge">⏳ এডমিনের অনুমোদনের অপেক্ষায়</p>}
        <div className="w-text">{w.body}</div>
        <div className="actions">
          <button className={'btn heart' + (mine ? ' on' : '')} onClick={onHeart} aria-pressed={mine}>{mine ? '❤️' : '🤍'} {hearts ? bn(hearts) : ''} ভালো লেগেছে</button>
          {isAdmin && w.status === 'pending' && <button className="btn" onClick={approve}>✓ অনুমোদন</button>}
          {canEdit && <button className="btn soft" onClick={onEdit}>✏️ সম্পাদনা</button>}
          {canEdit && <button className="btn soft w-del" onClick={remove}>মুছুন</button>}
        </div>
      </article>
    </Sheet>
  )
}

function Card({ w, hearts, mine, onOpen }) {
  const { fam } = useApp()
  const a = authorOf(w, fam)
  const lines = w.body.split('\n').filter(l => l.trim())
  const preview = w.kind === 'story' ? w.body.slice(0, 180) + (w.body.length > 180 ? '…' : '') : lines.slice(0, 4).join('\n') + (lines.length > 4 ? '\n…' : '')
  return (
    <button className={'card w-card k-' + w.kind} onClick={onOpen}>
      <span className="w-kind">{KIND[w.kind].i} {KIND[w.kind].l}</span>
      <h3>{w.title}</h3>
      <p className="w-prev">{preview}</p>
      <span className="w-foot">
        <span className="w-auth">{a.m && <Avatar m={a.m} size={24} />}{a.name}</span>
        <span>{w.status === 'pending' ? '⏳' : ''} {mine ? '❤️' : '🤍'} {bn(hearts || 0)}</span>
      </span>
    </button>
  )
}

export default function Writings({ id }) {
  const { fam, uid, isAdmin } = useApp()
  const [list, setList] = useState([])
  const [hearts, setHearts] = useState([])
  const [state, setState] = useState('loading') // loading | ok | missing
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [reading, setReading] = useState(null)
  const [editing, setEditing] = useState(null)   // null | 'new' | writing

  const load = useCallback(async () => {
    const [w, h] = await Promise.all([
      sb.from('writings').select('*').order('created_at', { ascending: false }),
      sb.from('writing_hearts').select('writing_id,user_id'),
    ])
    if (w.error) return setState('missing')
    setList(w.data || []); setHearts(h.data || []); setState('ok')
  }, [])
  useEffect(() => { load() }, [load])
  // শেয়ার করা লিংক #/writings/<id>
  useEffect(() => { if (id && state === 'ok') setReading(id) }, [id, state])

  const count = useMemo(() => {
    const c = new Map()
    for (const h of hearts) c.set(h.writing_id, (c.get(h.writing_id) || 0) + 1)
    return c
  }, [hearts])
  const mine = wid => hearts.some(h => h.writing_id === wid && h.user_id === uid)

  const toggleHeart = async wid => {
    const r = mine(wid)
      ? await sb.from('writing_hearts').delete().eq('writing_id', wid).eq('user_id', uid)
      : await sb.from('writing_hearts').insert({ writing_id: wid, user_id: uid })
    if (r.error) return alert(r.error.message)
    load()
  }

  if (state === 'missing') return (
    <div className="inner">
      <h1 className="page-title">গান, কবিতা ও গল্প</h1>
      <div className="card"><p>এই পেইজ চালু করতে এডমিন Supabase-এর SQL Editor-এ <code>writings.sql</code> একবার চালাবেন।</p></div>
    </div>
  )

  const t = normName(q)
  const pending = list.filter(w => w.status === 'pending')
  const shown = list
    .filter(w => w.status === 'approved' || w.created_by === uid)
    .filter(w => kind === 'all' || w.kind === kind)
    .filter(w => !t || normName(`${w.title} ${w.body} ${authorOf(w, fam).name}`).includes(t))
  const by = k => list.filter(w => w.status === 'approved' && w.kind === k).length
  const cur = reading && list.find(w => w.id === reading)

  return (
    <div className="inner">
      <h1 className="page-title">গান, কবিতা ও গল্প</h1>
      <p className="muted">পরিবারের মানুষের লেখা গান, কবিতা আর গল্প। দাদা-দাদির মুখে শোনা পুরনো দিনের গল্পও এখানে লিখে রাখুন, যেন পরের প্রজন্ম পড়তে পারে।</p>

      <div className="w-top">
        <button className="btn" onClick={() => setEditing('new')}>✍️ নতুন লেখা</button>
        <input className="w-search" value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 শিরোনাম, লেখা বা লেখকের নাম…" aria-label="লেখা খুঁজুন" />
      </div>

      <div className="seg w-tabs" role="tablist" aria-label="ধরন">
        <button role="tab" aria-selected={kind === 'all'} className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>সব</button>
        {KINDS.map(([k, i, l]) => (
          <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{i} {l} {by(k) > 0 && <small>{bn(by(k))}</small>}</button>
        ))}
      </div>

      {isAdmin && pending.length > 0 && (
        <div className="card w-pending">
          <h3>⏳ অনুমোদনের অপেক্ষায় · {bn(pending.length)}টি</h3>
          <p className="tags">{pending.map(w => <button key={w.id} className="chip" onClick={() => setReading(w.id)}>{KIND[w.kind].i} {w.title}</button>)}</p>
        </div>
      )}

      {state === 'loading' ? <p className="muted">লোড হচ্ছে…</p> : shown.length ? (
        <div className="grid w-grid">
          {shown.map(w => <Card key={w.id} w={w} hearts={count.get(w.id)} mine={mine(w.id)} onOpen={() => setReading(w.id)} />)}
        </div>
      ) : (
        <div className="card empty">
          <p>{q || kind !== 'all' ? 'এমন কোনো লেখা পাওয়া যায়নি।' : 'এখনো কোনো লেখা নেই। প্রথম লেখাটা আপনিই দিন!'}</p>
        </div>
      )}

      {cur && !editing && (
        <Reader w={cur} hearts={count.get(cur.id)} mine={mine(cur.id)} onHeart={() => toggleHeart(cur.id)}
          onEdit={() => setEditing(cur)} onChanged={load}
          onClose={() => { setReading(null); if (id) location.hash = '#/writings' }} />
      )}
      {editing && (
        <Sheet onClose={() => setEditing(null)}>
          <WriteForm item={editing === 'new' ? null : editing} onDone={changed => { setEditing(null); if (changed) load() }} />
        </Sheet>
      )}
    </div>
  )
}
