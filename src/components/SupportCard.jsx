import { useState } from 'react'
import { useApp } from '../ctx'

// শুভেচ্ছা মূল্য — বিকাশ নম্বর এডমিন পেইজ থেকে দেওয়া হয়; নম্বর না থাকলে কিছুই দেখায় না
export default function SupportCard() {
  const { content } = useApp()
  const s = content.support || {}
  const [copied, setCopied] = useState(false)
  if (!s.number) return null
  const copy = async () => {
    try { await navigator.clipboard.writeText(s.number.replace(/\D/g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { prompt('নম্বরটি কপি করুন:', s.number) }
  }
  return (
    <section className="card support" data-open>
      <div className="sup-ico" aria-hidden="true">🤝</div>
      <div className="sup-body">
        <h2>সাইটটির পাশে থাকুন</h2>
        <p>{s.note || 'সাইটটি ভালো লাগলে ইচ্ছেমতো শুভেচ্ছা মূল্য পাঠাতে পারেন। যত ইচ্ছা, তত। একদম না দিলেও কোনো সমস্যা নেই, আপনার দোয়াই যথেষ্ট।'}</p>
        <div className="sup-num">
          <span className="bkash">বিকাশ{s.kind ? ` (${s.kind})` : ''}</span>
          <b>{s.number}</b>
          <button className="btn sm" onClick={copy}>{copied ? '✓ কপি হয়েছে' : '📋 নম্বর কপি করুন'}</button>
        </div>
        <p className="muted small">বিকাশ অ্যাপ → সেন্ড মানি → এই নম্বর → আপনার ইচ্ছেমতো পরিমাণ। রেফারেন্সে "সরকার বংশ" লিখতে পারেন।</p>
      </div>
    </section>
  )
}
