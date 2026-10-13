// ক্লিকের শব্দ — কোনো অডিও ফাইল ছাড়াই ব্রাউজারে তৈরি হয় (Web Audio)
// প্রথম ক্লিকের পরেই শব্দ চালু হয়, কারণ ব্রাউজার ব্যবহারকারীর চাপ ছাড়া শব্দ বাজাতে দেয় না

let ctx = null
const KEY = 'sound-off'

export function soundOn() {
  try { return localStorage.getItem(KEY) !== '1' } catch { return true }
}
export function setSoundOn(on) {
  try { on ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '1') } catch { /* ignore */ }
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// একটি সুর: কম্পাঙ্ক (Hz), শুরুর সময়, দৈর্ঘ্য, জোর, ধরন
function tone(a, freq, at, dur, vol, type = 'sine', slideTo) {
  const o = a.createOscillator(), g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(a.destination)
  o.start(at)
  o.stop(at + dur + 0.02)
}

const SOUNDS = {
  // সাধারণ ক্লিক: নরম "টুক"
  click: (a, t) => tone(a, 660, t, 0.07, 0.12, 'sine', 990),
  // প্যানেল খোলা: হালকা উঠতি শব্দ
  open: (a, t) => { tone(a, 520, t, 0.09, 0.1, 'sine', 780); tone(a, 780, t + 0.05, 0.1, 0.07) },
  // সঠিক উত্তর: দুই সুরের ঝংকার
  ok: (a, t) => { tone(a, 784, t, 0.14, 0.16, 'triangle'); tone(a, 1175, t + 0.11, 0.22, 0.14, 'triangle') },
  // ভুল উত্তর: নিচু নরম শব্দ
  bad: (a, t) => tone(a, 260, t, 0.25, 0.14, 'triangle', 170),
  // ফলাফল/জয়: ছোট তিন সুর
  win: (a, t) => [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.09, 0.2, 0.13, 'triangle')),
}

export function play(name = 'click') {
  if (!soundOn()) return
  try {
    const a = ac()
    if (a) (SOUNDS[name] || SOUNDS.click)(a, a.currentTime + 0.001)
  } catch { /* শব্দ না বাজলেও সাইট চলবে */ }
}

// সাইটের সব লিংক ও বোতামে একসাথে শব্দ যোগ করে।
// কোনো বোতামে আলাদা শব্দ চাইলে data-sound="ok" দিন; শব্দ না চাইলে data-sound="none"
export function installClickSounds() {
  document.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return
    const el = e.target.closest('a, button, [role="button"], summary, label.check, select')
    if (!el || el.disabled) return
    const s = el.dataset.sound
    if (s === 'none') return
    play(s || 'click')
  }, { capture: true, passive: true })
  // কিবোর্ডে Enter/Space দিয়ে চাপলেও শব্দ
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const el = e.target.closest?.('a, button')
    if (el && !el.disabled && el.dataset.sound !== 'none') play(el.dataset.sound || 'click')
  }, { capture: true })
}
