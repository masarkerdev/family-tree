import { useCallback, useEffect, useMemo, useState } from 'react'
import { sb, fetchAll } from './supabase'
import { AppCtx } from './ctx'
import { buildFamily } from './lib/family'
import Nav from './components/Nav'
import Sheet from './components/Sheet'
import MemberSheet from './components/MemberSheet'
import MemberForm from './components/MemberForm'
import AuthModal from './components/AuthModal'
import PersonPicker from './components/PersonPicker'
import Home from './pages/Home'
import Ancestors from './pages/Ancestors'
import TreePage from './pages/TreePage'
import Memorial from './pages/Memorial'
import Games from './pages/Games'
import Admin from './pages/Admin'
import FamilyPrint from './pages/FamilyPrint'
import Roots from './pages/Roots'
import Album from './pages/Album'
import Places from './pages/Places'

function useHash() {
  const [h, setH] = useState(location.hash || '#/')
  useEffect(() => {
    const f = () => { setH(location.hash || '#/'); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return h
}

// লগইন করে নিজের পেইজ পাওয়ার পথ: তালিকায় নাম থাকলে দাবি, না থাকলে নতুন পেইজ
function Join({ c }) {
  const [pick, setPick] = useState(null)
  return (
    <div className="form">
      <h2>আমার পেইজ</h2>
      <p>বংশতালিকায় কি আপনার নাম আগে থেকেই আছে? নাম লিখে খুঁজুন, তারপর আপনার পেইজে গিয়ে <b>"🙋 এটা আমি"</b> চাপুন।</p>
      <PersonPicker value={pick} onChange={setPick} filter={m => !m.user_id} />
      {pick && <button className="btn" onClick={() => c.open(pick)}>এই পেইজে যান</button>}
      <hr />
      <p>তালিকায় নাম নেই? নতুন পেইজ বানান, বাবা-মা বেছে দিন। এডমিন অনুমোদন দিলে বংশবৃক্ষে যুক্ত হবে।</p>
      <button className="btn soft" onClick={() => c.addNew({ self: true })}>নতুন পেইজ বানান</button>
    </div>
  )
}

export default function App() {
  const hash = useHash()
  const [, page = '', arg] = hash.slice(1).split('/')
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('visitor')
  const [data, setData] = useState({ members: [], marriages: [], content: {} })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [sheet, setSheet] = useState(null) // {mode:'show'|'edit'|'new'|'join', id, preset}
  const [auth, setAuth] = useState(false)
  const [claims, setClaims] = useState([])
  const [album, setAlbum] = useState({ photos: [], tags: [], ready: false })

  const reload = useCallback(async () => {
    try {
      const [members, marriages, rows] = await Promise.all([fetchAll('members'), fetchAll('marriages'), fetchAll('site_content')])
      setData({ members, marriages, content: Object.fromEntries(rows.map(r => [r.key, r.value])) })
      setErr('')
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [])

  // অ্যালবাম আলাদাভাবে আনা হয় — album.sql না চালানো থাকলেও বাকি সাইট চলবে
  const reloadPhotos = useCallback(async () => {
    try {
      const [photos, tags] = await Promise.all([fetchAll('photos'), fetchAll('photo_tags')])
      photos.sort((a, b) => (b.year || 0) - (a.year || 0) || String(b.created_at).localeCompare(String(a.created_at)))
      setAlbum({ photos, tags, ready: true })
    } catch { setAlbum({ photos: [], tags: [], ready: false }) }
  }, [])

  const reloadClaims = useCallback(async () => {
    const { data: s } = await sb.auth.getSession()
    if (!s.session) return setClaims([])
    const { data } = await sb.from('claims').select('*').eq('user_id', s.session.user.id)
    setClaims(data || [])
  }, [])

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: l } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => l.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    reload()
    reloadClaims()
    reloadPhotos()
    if (session)
      sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => setRole(data?.role === 'admin' ? 'admin' : 'member'))
    else setRole('visitor')
  }, [session, reload, reloadClaims, reloadPhotos])

  // শেয়ার করা লিংক (#/m/<id>) খুললে সেই সদস্যের পেইজ
  useEffect(() => { if (page === 'm' && arg) setSheet({ mode: 'show', id: arg }) }, [page, arg])

  const fam = useMemo(() => buildFamily(data.members, data.marriages), [data])
  const uid = session?.user.id
  const me = uid ? data.members.find(m => m.user_id === uid) : null
  const photos = useMemo(() => {
    const by = new Map()
    for (const t of album.tags) { if (!by.has(t.photo_id)) by.set(t.photo_id, []); by.get(t.photo_id).push(t.member_id) }
    return album.photos.map(p => ({ ...p, tags: by.get(p.id) || [] }))
  }, [album])

  const close = useCallback(() => {
    setSheet(null)
    if (page === 'm') location.hash = '#/'
  }, [page])

  const ctx = {
    fam, session, uid, me, role, isAdmin: role === 'admin', content: data.content, claims,
    reload, reloadClaims, close, photos, albumReady: album.ready, reloadPhotos,
    open: id => setSheet({ mode: 'show', id }),
    edit: id => setSheet({ mode: 'edit', id }),
    addNew: preset => (session ? setSheet({ mode: 'new', preset }) : setAuth(true)),
    join: () => setSheet({ mode: 'join' }),
    login: () => { setSheet(null); setAuth(true) },
  }

  let body
  if (loading) body = <div className="inner center"><p className="muted">লোড হচ্ছে…</p></div>
  else if (err) body = <div className="inner"><div className="card"><h3>তথ্য আনা যায়নি</h3><p className="muted">{err}</p><p className="small">.env ফাইলে Supabase-এর URL ও key ঠিক আছে কিনা, আর schema.sql চালানো হয়েছে কিনা দেখুন।</p></div></div>
  else if (page === 'ancestors') body = <Ancestors />
  else if (page === 'tree') body = <TreePage />
  else if (page === 'memorial') body = <Memorial />
  else if (page === 'games') body = <Games />
  else if (page === 'admin') body = <Admin />
  else if (page === 'family') body = <FamilyPrint id={arg} />
  else if (page === 'roots') body = <Roots id={arg} />
  else if (page === 'album') body = <Album photoId={arg} />
  else if (page === 'places') body = <Places />
  else body = <Home />

  return (
    <AppCtx.Provider value={ctx}>
      <Nav page={page} />
      <main>{body}</main>
      <footer className="foot">
        <p>সরকার বংশ · অলুয়া, ব্রাহ্মণপাড়া, কুমিল্লা</p>
        <p className="muted small">ভুল তথ্য চোখে পড়লে নিজের পেইজ থেকে ঠিক করুন, অথবা এডমিনকে জানান।</p>
      </footer>
      {sheet && (
        <Sheet onClose={close}>
          {sheet.mode === 'show' && <MemberSheet key={sheet.id} id={sheet.id} />}
          {sheet.mode === 'edit' && <MemberForm key={'e' + sheet.id} id={sheet.id} />}
          {sheet.mode === 'new' && <MemberForm key={'n' + JSON.stringify(sheet.preset)} preset={sheet.preset} />}
          {sheet.mode === 'join' && <Join c={ctx} />}
        </Sheet>
      )}
      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </AppCtx.Provider>
  )
}
