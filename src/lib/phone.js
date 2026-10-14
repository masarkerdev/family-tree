// মোবাইল নম্বর দিয়ে একাউন্ট: Supabase-এর ইমেইল-পাসওয়ার্ড ব্যবস্থার ভেতরে নম্বরটাকে
// একটা নকল ইমেইল ঠিকানায় রূপ দেওয়া হয় (যেমন 01712345678@mobile.sarkarbari.app)।
// কোনো SMS বা ইমেইল যায় না, তাই কোনো খরচ নেই। (Supabase-এ "Confirm email" বন্ধ রাখতে হবে)
export const PHONE_DOMAIN = 'mobile.sarkarbari.app'

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

// যেকোনো ভাবে লেখা নম্বর → 01XXXXXXXXX, ভুল হলে null
export function normPhone(s) {
  let d = String(s || '').replace(/[০-৯]/g, c => BN_DIGITS.indexOf(c)).replace(/\D/g, '')
  if (d.startsWith('880')) d = d.slice(2)
  else if (d.startsWith('88')) d = d.slice(2)
  if (d.length === 10 && d.startsWith('1')) d = '0' + d
  return /^01[3-9]\d{8}$/.test(d) ? d : null
}

export const phoneEmail = p => `${p}@${PHONE_DOMAIN}`
export const isPhoneEmail = e => String(e || '').endsWith('@' + PHONE_DOMAIN)

// এডমিন পেইজে দেখানোর জন্য: মোবাইল একাউন্ট হলে নম্বর, নইলে ইমেইল
export const accountLabel = e => (isPhoneEmail(e) ? '📱 ' + e.split('@')[0] : e || '')
