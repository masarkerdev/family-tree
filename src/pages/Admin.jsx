import { useEffect, useState } from 'react'
import { sb, fetchAll } from '../supabase'
import { useApp } from '../ctx'
import { bn, download } from '../lib/util'
import Avatar from '../components/Avatar'
import PersonPicker, { nameMatches } from '../components/PersonPicker'
import { accountLabel } from '../lib/phone'

function Approvals() {
  const c = useApp()
  const { fam } = c
  const pending = fam.members.filter(m => m.status === 'pending')
  const [claims, setClaims] = useState([])
  const [emails, setEmails] = useState({})
  const [waiting, setWaiting] = useState([])     // অনুমতির অপেক্ষায় থাকা নতুন একাউন্ট
  const [noCol, setNoCol] = useState(false)
  const [link, setLink] = useState({})           // একাউন্ট → কোন সদস্যের পেইজের সাথে যুক্ত হবে
  const load = async () => {
    const { data } = await sb.from('claims').select('*').eq('status', 'pending').order('created_at')
    setClaims(data || [])
    const { data: p } = await sb.from('profiles').select('id,email')
    setEmails(Object.fromEntries((p || []).map(x => [x.id, x.email])))
    const w = await sb.from('profiles').select('id,email,name,phone,created_at').eq('approved', false).order('created_at')
    setNoCol(!!w.error)
    setWaiting(w.data || [])
    // নামের সাথে মেলে, এখনো কারো একাউন্টে যুক্ত নয়, এমন একজন থাকলে আগে থেকেই বেছে রাখা
    setLink(Object.fromEntries((w.data || []).map(a => {
      const hit = fam.members.filter(m => !m.user_id && a.name && nameMatches(m.name, a.name))
      return [a.id, hit.length === 1 ? hit[0].id : null]
    })))
  }
  useEffect(() => { load() }, [])

  const approve = async m => {
    const { error } = await sb.from('members').update({ status: 'approved' }).eq('id', m.id)
    if (error) return alert(error.message)
    c.reload()
  }
  const review = async (a, ok) => {
    const who = a.name || accountLabel(a.email)
    if (!ok && !confirm(`${who}-এর একাউন্ট বাতিল করে মুছে ফেলবেন?`)) return
    const { error } = await sb.rpc('admin_review_user', { target: a.id, ok })
    if (error) return alert(error.message)
    if (ok && link[a.id]) {
      const r = await sb.from('members').update({ user_id: a.id }).eq('id', link[a.id])
      if (r.error) alert(r.error.message)
      if (a.phone) await sb.from('member_private').upsert({ member_id: link[a.id], phone: a.phone })
    }
    load(); c.reload()
  }
  const decide = async (cl, ok) => {
    if (ok) {
      const { error } = await sb.from('members').update({ user_id: cl.user_id }).eq('id', cl.member_id)
      if (error) return alert(error.message)
    }
    await sb.from('claims').update({ status: ok ? 'approved' : 'rejected' }).eq('id', cl.id)
    load(); c.reload()
  }

  return (
    <>
      <h2 className="sec">নতুন একাউন্ট ({bn(waiting.length)})</h2>
      {noCol ? <p className="note">এই অংশ চালু করতে Supabase-এ <code>account-approval.sql</code> চালান।</p> : (
        <>
          <p className="muted small">অনুমতি দিলে তবেই এঁরা লগইন করতে পারবেন। চেনা মানুষ কিনা নম্বরে ফোন করে নিশ্চিত হয়ে নিন। বংশতালিকায় তাঁর নাম থাকলে বেছে দিন, তাহলে নিজের পেইজ নিজে সাজাতে পারবেন।</p>
          {waiting.length ? waiting.map(a => (
            <div key={a.id} className="card adm-acc">
              <div className="adm-acc-top">
                <span><b>{a.name || 'নাম দেওয়া নেই'}</b><small>{a.phone ? <a href={`tel:${a.phone}`}>📱 {a.phone}</a> : accountLabel(a.email)}</small></span>
                <div className="actions">
                  <button className="btn sm" onClick={() => review(a, true)}>✓ অনুমতি দিন</button>
                  <button className="btn sm soft" onClick={() => review(a, false)}>বাতিল</button>
                </div>
              </div>
              <label className="small">বংশতালিকায় ইনি কে? (না থাকলে খালি রাখুন)
                <PersonPicker value={link[a.id]} onChange={v => setLink(l => ({ ...l, [a.id]: v }))} filter={m => !m.user_id} placeholder="নাম লিখে খুঁজুন…" />
              </label>
            </div>
          )) : <p className="muted">কোনো নতুন একাউন্ট অপেক্ষায় নেই।</p>}
        </>
      )}

      <h2 className="sec">নতুন সদস্য ({bn(pending.length)})</h2>
      {pending.length ? pending.map(m => (
        <div key={m.id} className="card adm-row">
          <Avatar m={m} size={44} />
          <span><b>{m.name}</b><small>{fam.sub(m) || 'বাবা/মা দেওয়া হয়নি'}</small></span>
          <div className="actions">
            <button className="btn sm" onClick={() => approve(m)}>✓ অনুমোদন</button>
            <button className="btn sm soft" onClick={() => c.open(m.id)}>দেখুন / সম্পাদনা</button>
          </div>
        </div>
      )) : <p className="muted">কোনো অপেক্ষমাণ সদস্য নেই।</p>}

      <h2 className="sec">"এটা আমি" দাবি ({bn(claims.length)})</h2>
      <p className="muted small">দাবি অনুমোদন দিলে ওই একাউন্ট সংশ্লিষ্ট পেইজ নিজে সম্পাদনা করতে পারবে। চেনা মানুষ কিনা নিশ্চিত হয়ে তবেই দিন।</p>
      {claims.length ? claims.map(cl => {
        const m = fam.byId.get(cl.member_id)
        return (
          <div key={cl.id} className="card adm-row">
            {m && <Avatar m={m} size={44} />}
            <span><b>{m?.name || 'মুছে ফেলা সদস্য'}</b><small>দাবিদার: {accountLabel(emails[cl.user_id]) || cl.user_id}</small></span>
            <div className="actions">
              <button className="btn sm" onClick={() => decide(cl, true)}>✓ মেনে নিন</button>
              <button className="btn sm soft" onClick={() => decide(cl, false)}>বাতিল</button>
            </div>
          </div>
        )
      }) : <p className="muted">কোনো দাবি নেই।</p>}
    </>
  )
}

function Content() {
  const c = useApp()
  const [about, setAbout] = useState(c.content.about || '')
  const [arrival, setArrival] = useState(c.content.arrival || '')
  const [amal, setAmal] = useState((c.content.amal || []).join('\n'))
  const [quotes, setQuotes] = useState(c.content.quotes || [])
  const [sup, setSup] = useState(() => ({ number: '', kind: 'পার্সোনাল', note: '', ...(c.content.support || {}) }))
  const [msg, setMsg] = useState('')
  const save = async () => {
    const rows = [
      { key: 'about', value: about },
      { key: 'arrival', value: arrival.trim() },
      { key: 'amal', value: amal.split('\n').map(s => s.trim()).filter(Boolean) },
      { key: 'quotes', value: quotes.filter(q => q.text?.trim()) },
      { key: 'support', value: { number: sup.number.trim(), kind: sup.kind.trim(), note: sup.note.trim() } },
    ]
    const { error } = await sb.from('site_content').upsert(rows.map(r => ({ ...r, updated_at: new Date().toISOString() })))
    if (error) return alert(error.message)
    setMsg('সংরক্ষিত হয়েছে ✓'); setTimeout(() => setMsg(''), 2500)
    c.reload()
  }
  const setQ = (i, k, v) => setQuotes(qs => qs.map((q, j) => (j === i ? { ...q, [k]: v } : q)))
  return (
    <div className="form">
      <fieldset>
        <legend>🤝 শুভেচ্ছা মূল্য (বিকাশ)</legend>
        <p className="muted small">নম্বর দিলে হোম পেইজের নিচে একটা কার্ড দেখাবে। খালি রাখলে কার্ড লুকানো থাকবে।</p>
        <div className="two-col">
          <label>বিকাশ নম্বর<input type="tel" value={sup.number} onChange={e => setSup(s => ({ ...s, number: e.target.value }))} placeholder="০১৭XXXXXXXX" /></label>
          <label>একাউন্টের ধরন<input value={sup.kind} onChange={e => setSup(s => ({ ...s, kind: e.target.value }))} placeholder="পার্সোনাল" /></label>
        </div>
        <label>বার্তা (না দিলে একটা সাধারণ বার্তা দেখাবে)<textarea rows="2" value={sup.note} onChange={e => setSup(s => ({ ...s, note: e.target.value }))} /></label>
      </fieldset>
      <label>হোমের উপরের ছোট লাইন (না দিলে দেখাবে না)
        <input value={arrival} onChange={e => setArrival(e.target.value)} placeholder="যেমন: অমুক সালে বংশের প্রথম পুরুষের অলুয়ায় আগমন" />
      </label>
      <label>আমাদের বংশ (হোম পেইজের পরিচিতি)<textarea rows="6" value={about} onChange={e => setAbout(e.target.value)} /></label>
      <label>আজকের আমল — প্রতি লাইনে একটি, প্রতিদিন একটি করে ঘুরে দেখাবে
        <textarea rows="8" value={amal} onChange={e => setAmal(e.target.value)} />
      </label>
      <p className="muted small">আমল বা দোয়ার লেখা নির্ভরযোগ্য উৎস থেকে যাচাই করে দিন।</p>
      <fieldset>
        <legend>প্রবীণদের কথা</legend>
        {quotes.map((q, i) => (
          <div key={i} className="quote-edit">
            <PersonPicker value={q.member_id} onChange={v => setQ(i, 'member_id', v)} placeholder="কার কথা?" />
            <textarea rows="3" value={q.text || ''} onChange={e => setQ(i, 'text', e.target.value)} placeholder="তাঁর কথা, উপদেশ বা স্মৃতি…" />
            <button type="button" className="btn sm danger" onClick={() => setQuotes(qs => qs.filter((_, j) => j !== i))}>মুছুন</button>
          </div>
        ))}
        <button type="button" className="btn soft" onClick={() => setQuotes([...quotes, { member_id: null, text: '' }])}>+ নতুন কথা</button>
      </fieldset>
      <div className="actions"><button className="btn" onClick={save}>সংরক্ষণ করুন</button><span>{msg}</span></div>
    </div>
  )
}

function Admins() {
  const { uid, fam } = useApp()
  const [list, setList] = useState([])
  const load = () => sb.from('profiles').select('*').order('created_at').then(({ data }) => setList(data || []))
  useEffect(() => { load() }, [])
  const toggle = async p => {
    if (p.id === uid) return alert('নিজের এডমিন ক্ষমতা নিজে সরানো যাবে না।')
    const role = p.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`${accountLabel(p.email)}-কে ${role === 'admin' ? 'এডমিন বানাবেন' : 'এডমিন থেকে সরাবেন'}?`)) return
    const { error } = await sb.from('profiles').update({ role }).eq('id', p.id)
    if (error) return alert(error.message)
    load()
  }
  // মোবাইলের একাউন্টে রিসেট লিংক যায় না, তাই এডমিন নতুন পাসওয়ার্ড দেবেন
  const resetPw = async p => {
    const pw = prompt(`${accountLabel(p.email)}-এর নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর):`)
    if (!pw) return
    if (pw.length < 6) return alert('কমপক্ষে ৬ অক্ষর দিন।')
    const { error } = await sb.rpc('admin_set_password', { target: p.id, new_password: pw })
    if (error) return alert(error.message.includes('admin_set_password') ? 'আগে Supabase-এ phone-bari.sql চালান।' : error.message)
    alert(`পাসওয়ার্ড বদলানো হয়েছে। তাঁকে জানিয়ে দিন: ${pw}`)
  }
  return (
    <>
      <p className="muted">বংশের প্রতিটি শাখা থেকে অন্তত একজন বিশ্বস্ত মানুষকে এডমিন রাখুন, যেন একজনের ওপর সাইট নির্ভর না করে।</p>
      {list.map(p => {
        const m = fam.members.find(x => x.user_id === p.id)
        return (
          <div key={p.id} className="card adm-row">
            <span><b>{p.name || accountLabel(p.email)}</b><small>{p.name ? accountLabel(p.email) + ' · ' : ''}{p.approved === false ? '⏳ অনুমতির অপেক্ষায় · ' : ''}{p.role === 'admin' ? '⭐ এডমিন' : 'সদস্য'}{m ? ` · ${m.name}` : ' · পেইজের সাথে যুক্ত নয়'}</small></span>
            <div className="actions">
              <button className="btn sm soft" onClick={() => resetPw(p)}>🔑 পাসওয়ার্ড</button>
              <button className="btn sm soft" onClick={() => toggle(p)}>{p.role === 'admin' ? 'এডমিন থেকে সরান' : 'এডমিন বানান'}</button>
            </div>
          </div>
        )
      })}
    </>
  )
}

function History() {
  const c = useApp()
  const [rows, setRows] = useState([])
  const load = () => sb.from('members_history').select('*').order('changed_at', { ascending: false }).limit(40)
    .then(({ data }) => setRows(data || []))
  useEffect(() => { load() }, [])
  const restore = async r => {
    if (!confirm(`"${r.old_row.name}"-এর আগের অবস্থা ফিরিয়ে আনবেন?`)) return
    const old = { ...r.old_row }
    const { error } = r.action === 'DELETE'
      ? await sb.from('members').insert(old)
      : await sb.from('members').update((({ id, ...rest }) => rest)(old)).eq('id', old.id)
    if (error) return alert(error.message)
    c.reload(); load()
  }
  return (
    <>
      <p className="muted">শেষ ৪০টি বদল। কেউ ভুল করে কিছু বদলালে বা মুছলে এখান থেকে আগের অবস্থায় ফেরানো যাবে।</p>
      {rows.map(r => (
        <div key={r.id} className="card adm-row">
          <span><b>{r.old_row?.name}</b><small>{r.action === 'DELETE' ? '🗑️ মোছা হয়েছে' : '✏️ বদলানো হয়েছে'} · {new Date(r.changed_at).toLocaleString('bn-BD')}</small></span>
          <div className="actions"><button className="btn sm soft" onClick={() => restore(r)}>↩ ফিরিয়ে আনুন</button></div>
        </div>
      ))}
      {!rows.length && <p className="muted">এখনো কোনো বদল নেই।</p>}
    </>
  )
}

function Backup() {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const [members, marriages, site_content, member_private] = await Promise.all(
        ['members', 'marriages', 'site_content', 'member_private'].map(t => fetchAll(t)))
      const stamp = new Date().toISOString().slice(0, 10)
      download(`sarkar-bongsho-backup-${stamp}.json`, JSON.stringify({ exported_at: new Date().toISOString(), members, marriages, site_content, member_private }, null, 2))
      const cols = ['id', 'name', 'gender', 'father_id', 'mother_id', 'birth_year', 'birth_date', 'is_deceased', 'death_year', 'death_date', 'occupation', 'address', 'bio']
      const csv = '﻿' + [cols.join(','), ...members.map(m => cols.map(k => `"${String(m[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
      download(`sarkar-bongsho-members-${stamp}.csv`, csv, 'text/csv')
    } catch (e) { alert(e.message) }
    setBusy(false)
  }
  return (
    <>
      <p>সব তথ্য দুটি ফাইলে নামবে: পুরো ব্যাকআপ (JSON) আর সদস্য তালিকা (Excel-এ খোলা যায় এমন CSV)।</p>
      <p className="muted">মাসে অন্তত একবার নামিয়ে দুই-তিনজন বিশ্বস্ত আত্মীয়ের কাছে রাখুন। ভবিষ্যতে অন্য কোনো সিস্টেমেও এই ফাইল দিয়ে সব তথ্য ফেরানো যাবে।</p>
      <button className="btn" onClick={run} disabled={busy}>{busy ? 'তৈরি হচ্ছে…' : '⬇️ ব্যাকআপ ডাউনলোড'}</button>
    </>
  )
}

const TABS = [['ap', 'অনুমোদন', Approvals], ['ct', 'হোম পেইজের লেখা', Content], ['ad', 'এডমিন', Admins], ['hi', 'বদলের ইতিহাস', History], ['bk', 'ব্যাকআপ', Backup]]

export default function Admin() {
  const { isAdmin, addNew } = useApp()
  const [tab, setTab] = useState('ap')
  if (!isAdmin) return <div className="inner"><p className="muted">এই পেইজ শুধু এডমিনদের জন্য।</p></div>
  const Cur = TABS.find(t => t[0] === tab)[2]
  return (
    <div className="inner">
      <h1 className="page-title">এডমিন</h1>
      <div className="toolbar">
        {TABS.map(([k, l]) => <button key={k} className={'btn sm' + (tab === k ? '' : ' soft')} onClick={() => setTab(k)}>{l}</button>)}
        <button className="btn sm pink" onClick={() => addNew({})}>+ সদস্য যোগ</button>
      </div>
      <Cur />
    </div>
  )
}
