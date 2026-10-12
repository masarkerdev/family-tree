import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const root = createRoot(document.getElementById('root'))

// কোনো সমস্যা হলে সাদা পর্দার বদলে কারণটা দেখায়
function Problem({ title, detail, hint }) {
  return (
    <div className="inner">
      <div className="card">
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
        {detail && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: 'var(--soft)', padding: 12, borderRadius: 10 }}>{detail}</pre>}
      </div>
    </div>
  )
}

class Boundary extends React.Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err)
      return <Problem title="সাইটে একটি ত্রুটি হয়েছে" hint="পেইজ রিফ্রেশ করে দেখুন। আবার হলে নিচের লেখাটা এডমিনকে পাঠান।" detail={String(this.state.err?.stack || this.state.err)} />
    return this.props.children
  }
}

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const missing = [!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean)

if (missing.length) {
  root.render(
    <Problem
      title="Supabase-এর সংযোগ সেট করা হয়নি"
      hint="Vercel → Settings → Environment Variables-এ নিচের নামগুলো যোগ করুন, তারপর Deployments থেকে Redeploy করুন। কম্পিউটারে চালালে .env ফাইলে দিন এবং npm run dev আবার চালু করুন।"
      detail={'যা পাওয়া যায়নি:\n' + missing.join('\n')}
    />
  )
} else {
  import('./App')
    .then(({ default: App }) => root.render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>))
    .catch(e => root.render(<Problem title="সাইট চালু করা যায়নি" detail={String(e?.stack || e)} />))
}
