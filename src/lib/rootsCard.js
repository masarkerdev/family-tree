import { bn, birthYear, deathYear, hashHue } from './util'

// পথের প্রতিটি মানুষের সম্পর্কের নাম (নিজের দিক থেকে)
export function relLabel(chain, i) {
  if (i === 0) return 'আমি'
  const p = chain[i], g = p.gender === 'female'
  const viaMother = chain[1]?.gender === 'female'   // প্রথম ধাপ মায়ের দিকে হলে নানাবাড়ির ধারা
  if (i === 1) return g ? 'মা' : 'বাবা'
  if (i === 2) return viaMother ? (g ? 'নানি' : 'নানা') : (g ? 'দাদি' : 'দাদা')
  if (i === 3) return viaMother ? (g ? 'পরনানি' : 'পরনানা') : (g ? 'পরদাদি' : 'পরদাদা')
  return `${bn(i)} প্রজন্ম আগে`
}

const W = 1080
const loadImg = src => new Promise(res => {
  if (!src) return res(null)
  const im = new Image()
  im.crossOrigin = 'anonymous'
  im.onload = () => res(im)
  im.onerror = () => res(null)
  im.src = src
})

function circleImg(c, im, x, y, r) {
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); c.clip()
  const s = Math.max((r * 2) / im.width, (r * 2) / im.height)
  c.drawImage(im, x - (im.width * s) / 2, y - (im.height * s) / 2, im.width * s, im.height * s)
  c.restore()
}

function initialCircle(c, m, x, y, r) {
  const h = hashHue(m.id)
  const g = c.createLinearGradient(x - r, y - r, x + r, y + r)
  g.addColorStop(0, `hsl(${h} 62% 52%)`); g.addColorStop(1, `hsl(${h + 40} 62% 36%)`)
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#fff'; c.font = `800 ${Math.round(r * 0.9)}px "Anek Bangla", "Hind Siliguri", sans-serif`
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText([...m.name][0] || '?', x, y + r * 0.06)
}

// লম্বা নাম হলে ফন্ট ছোট করে এক লাইনে আঁটানো
function fitText(c, text, maxW, size, weight, family) {
  let s = size
  do { c.font = `${weight} ${s}px ${family}`; s -= 2 } while (c.measureText(text).width > maxW && s > 18)
}

// "আমার শিকড়" কার্ড ক্যানভাসে আঁকা — যা দেখা যায় ঠিক সেটাই ছবি হিসেবে নামে
export async function drawRootsCard(chain, opts = {}) {
  const rows = chain.length
  const ROW = 168, TOP = 330, BOTTOM = 150
  const H = TOP + rows * ROW + BOTTOM
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const c = cv.getContext('2d')
  const disp = '"Anek Bangla", "Hind Siliguri", sans-serif', body = '"Hind Siliguri", "Anek Bangla", sans-serif'
  try { await Promise.all([document.fonts.load(`800 60px "Anek Bangla"`, 'বংশ'), document.fonts.load(`500 30px "Hind Siliguri"`, 'বংশ')]) } catch { /* ফন্ট না পেলে বিকল্প ফন্টে আঁকে */ }
  const imgs = await Promise.all(chain.map(m => loadImg(m.photo_url)))

  // পটভূমি
  const bg = c.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b4a42'); bg.addColorStop(0.55, '#14705f'); bg.addColorStop(1, '#2d8f6f')
  c.fillStyle = bg; c.fillRect(0, 0, W, H)
  const glow = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  glow(W * 0.1, 140, 520, 'rgba(232,163,61,.35)')
  glow(W * 0.95, H - 120, 600, 'rgba(232,74,134,.28)')

  // শিরোনাম
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(255,255,255,.85)'
  c.font = `500 30px ${body}`
  c.fillText(opts.place || 'অলুয়া · ব্রাহ্মণপাড়া · কুমিল্লা', W / 2, 92)
  c.fillStyle = '#fff'; c.font = `800 92px ${disp}`
  c.fillText('আমার শিকড়', W / 2, 200)
  c.fillStyle = '#e8a33d'
  fitText(c, `${chain[0].name} থেকে ${chain[rows - 1].name} পর্যন্ত · ${bn(rows)} প্রজন্ম`, W - 140, 34, 600, body)
  c.fillText(`${chain[0].name} থেকে ${chain[rows - 1].name} পর্যন্ত · ${bn(rows)} প্রজন্ম`, W / 2, 262)

  // সংযোগ রেখা
  const X = 210
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 6; c.setLineDash([2, 14]); c.lineCap = 'round'
  c.beginPath(); c.moveTo(X, TOP + ROW / 2); c.lineTo(X, TOP + (rows - 1) * ROW + ROW / 2); c.stroke(); c.setLineDash([])

  chain.forEach((m, i) => {
    const y = TOP + i * ROW + ROW / 2, r = i === 0 ? 66 : 58
    // সোনালি বলয়
    c.beginPath(); c.arc(X, y, r + 9, 0, Math.PI * 2); c.fillStyle = i === 0 ? '#e8a33d' : 'rgba(255,255,255,.9)'; c.fill()
    c.beginPath(); c.arc(X, y, r + 4, 0, Math.PI * 2); c.fillStyle = '#0f5e52'; c.fill()
    if (imgs[i]) circleImg(c, imgs[i], X, y, r); else initialCircle(c, m, X, y, r)

    c.textAlign = 'left'
    c.fillStyle = i === 0 ? '#e8a33d' : 'rgba(255,255,255,.75)'; c.font = `600 28px ${body}`
    c.fillText(relLabel(chain, i), X + 100, y - 30)
    c.fillStyle = '#fff'
    fitText(c, (m.is_deceased ? (m.gender === 'female' ? 'মরহুমা ' : 'মরহুম ') : '') + m.name, W - X - 160, 48, 700, disp)
    c.fillText((m.is_deceased ? (m.gender === 'female' ? 'মরহুমা ' : 'মরহুম ') : '') + m.name, X + 100, y + 22)
    const b = birthYear(m), d = deathYear(m)
    const yrs = b || d ? `${b ? bn(b) : '?'}${m.is_deceased ? ` – ${d ? bn(d) : '?'}` : ''}` : ''
    if (yrs) { c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `500 26px ${body}`; c.fillText(yrs, X + 100, y + 58) }
  })

  // নিচের অংশ
  c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `700 40px ${disp}`
  c.fillText('সরকার বংশ', W / 2, H - 78)
  if (opts.url) { c.fillStyle = 'rgba(255,255,255,.65)'; c.font = `500 24px ${body}`; c.fillText(opts.url, W / 2, H - 38) }
  return cv
}
