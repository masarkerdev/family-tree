// মোবাইল নম্বর দিয়ে একাউন্ট: Supabase-এর ইমেইল-পাসওয়ার্ড ব্যবস্থার ভেতরে নম্বরটাকে
// এডমিনের নিজের Gmail-এর "+" ঠিকানায় রূপ দেওয়া হয়, যেমন:
//   VITE_PHONE_LOGIN_EMAIL = sarkarbari@gmail.com
//   01712345678  →  sarkarbari+01712345678@gmail.com
// Supabase শুধু আসল (MX রেকর্ড আছে এমন) ডোমেইন মানে, তাই বানানো ডোমেইন চলে না।
// "Confirm email" বন্ধ থাকলে কোনো ইমেইল যায় না; গেলেও সেটা এডমিনের ইনবক্সেই আসবে।
const BASE = String(import.meta.env.VITE_PHONE_LOGIN_EMAIL || '').trim().toLowerCase()
const [USER, DOMAIN] = BASE.includes('@') ? BASE.split('@') : ['', '']

export const phoneLoginReady = !!(USER && DOMAIN)

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

// যেকোনো ভাবে লেখা নম্বর → 01XXXXXXXXX, ভুল হলে null
export function normPhone(s) {
  let d = String(s || '').replace(/[০-৯]/g, c => BN_DIGITS.indexOf(c)).replace(/\D/g, '')
  if (d.startsWith('88')) d = d.slice(2)
  if (d.length === 10 && d.startsWith('1')) d = '0' + d
  return /^01[3-9]\d{8}$/.test(d) ? d : null
}

export const phoneEmail = p => `${USER}+${p}@${DOMAIN}`

const PHONE_RE = /\+(01[3-9]\d{8})@/
export const isPhoneEmail = e => phoneLoginReady && PHONE_RE.test(String(e || '')) && String(e).toLowerCase().endsWith('@' + DOMAIN)

// এডমিন পেইজে দেখানোর জন্য: মোবাইল একাউন্ট হলে নম্বর, নইলে ইমেইল
export const accountLabel = e => (isPhoneEmail(e) ? '📱 ' + String(e).match(PHONE_RE)[1] : e || '')
