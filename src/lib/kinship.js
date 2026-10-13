// বাংলা আত্মীয়তার নাম নির্ণয়।
// "B হলেন A-এর ___" — রক্তের সম্পর্ক (বাবা ও মা দুই দিক), আর বিয়ের সূত্রের সম্পর্কও।
import { bn } from './util'

const M = p => p?.gender !== 'female'          // পুরুষ কিনা (লিঙ্গ না দেওয়া থাকলে পুরুষ ধরা হয়)

// শব্দের সাথে "-এর" যোগ (বাবা→বাবার, ভাই→ভাইয়ের, বোন→বোনের, মা→মায়ের)
const IRREG = { মা: 'মায়ের', ভাই: 'ভাইয়ের' }
export function poss(w) {
  const words = w.split(' '), last = words.pop()
  let p
  if (!/[\u0980-\u09FF]$/.test(last)) return `${w}-এর`   // বাংলা অক্ষরে শেষ না হলে, যেমন "(সাজু)"
  if (IRREG[last]) p = IRREG[last]
  else if (/[অআইঈউঊএঐওঔ]$/.test(last)) p = last + 'য়ের'
  else if (/[া-ৌ]$/.test(last)) p = last + 'র'
  else p = last + 'ের'
  return [...words, p].join(' ')
}

// পূর্বপুরুষের দিকে: n ধাপ উপরে, side = প্রথম ধাপ বাবা (true) না মা (false)
function upTerm(n, paternal, male) {
  if (n === 1) return male ? 'বাবা' : 'মা'
  if (n === 2) return paternal ? (male ? 'দাদা' : 'দাদি') : (male ? 'নানা' : 'নানি')
  if (n === 3) return paternal ? (male ? 'পরদাদা' : 'পরদাদি') : (male ? 'পরনানা' : 'পরনানি')
  if (n === 4) return (paternal ? 'দাদার ' : 'নানার ') + (male ? 'দাদা' : 'দাদি')
  return `${bn(n)} প্রজন্ম আগের ${male ? 'পূর্বপুরুষ' : 'পূর্বনারী'}`
}

// বংশধরের দিকে: m ধাপ নিচে
function downTerm(m, male) {
  if (m === 1) return male ? 'ছেলে' : 'মেয়ে'
  if (m === 2) return male ? 'নাতি' : 'নাতনি'
  if (m === 3) return male ? 'পুতি' : 'পুতনি'
  return `${bn(m)} প্রজন্ম পরের বংশধর`
}

const COUSIN = { চাচা: 'চাচাতো', ফুফু: 'ফুফাতো', মামা: 'মামাতো', খালা: 'খালাতো' }

// aPath = [A, A-এর বাবা/মা, …, সাধারণ পূর্বপুরুষ C]; bPath = [B, …, C]
function bloodTerm(aPath, bPath) {
  const n = aPath.length - 1, m = bPath.length - 1, B = bPath[0]
  const paternal = n > 0 ? M(aPath[1]) : true
  if (n === 0) return downTerm(m, M(B))
  if (m === 0) return upTerm(n, paternal, M(B))

  const Q = aPath[n - 1]       // A-এর দিকে C-এর সন্তান (n=1 হলে A নিজে)
  const S = bPath[m - 1]       // B-এর দিকে C-এর সন্তান — Q-এর ভাই বা বোন
  let sib
  if (n === 1) sib = M(S) ? 'ভাই' : 'বোন'
  else if (n === 2) sib = M(Q) ? (M(S) ? 'চাচা' : 'ফুফু') : (M(S) ? 'মামা' : 'খালা')
  else sib = `${poss(upTerm(n - 1, paternal, M(Q)))} ${M(S) ? 'ভাই' : 'বোন'}`

  const k = m - 1               // S থেকে B কত ধাপ নিচে
  if (k === 0) return sib
  if (k === 1) {
    if (n === 1) return M(S) ? (M(B) ? 'ভাতিজা' : 'ভাতিজি') : (M(B) ? 'ভাগ্নে' : 'ভাগ্নি')
    if (n === 2) return `${COUSIN[sib]} ${M(B) ? 'ভাই' : 'বোন'}`
    return `${poss(sib)} ${M(B) ? 'ছেলে' : 'মেয়ে'}`
  }
  // আরও নিচে: ভাই-বোন বা দাদার ভাইয়ের দিকে "ভাইয়ের নাতনি", "দাদার ভাইয়ের নাতি"
  if (n !== 2) return `${poss(sib)} ${downTerm(k, M(B))}`
  // চাচাতো/মামাতো ধারায়: "চাচাতো ভাইয়ের মেয়ে", "খালাতো বোনের ছেলের মেয়ে"
  return `${poss(bloodTerm(aPath, bPath.slice(1)))} ${M(B) ? 'ছেলে' : 'মেয়ে'}`
}

// প্রজন্মের হিসাবে সহজ ডাক (যৌগিক সম্পর্কের পাশে "সম্পর্কে ___")
function generational(aPath, bPath) {
  const n = aPath.length - 1, m = bPath.length - 1, B = bPath[0], g = n - m
  const paternal = n > 0 ? M(aPath[1]) : true
  if (n === 0 || m === 0) return null
  if (g === 0) return M(B) ? 'ভাই' : 'বোন'
  if (g === 1) return paternal ? (M(B) ? 'চাচা' : 'ফুফু') : (M(B) ? 'মামা' : 'খালা')
  if (g === 2) return paternal ? (M(B) ? 'দাদা' : 'দাদি') : (M(B) ? 'নানা' : 'নানি')
  if (g === -1) return M(bPath[1]) ? (M(B) ? 'ভাতিজা' : 'ভাতিজি') : (M(B) ? 'ভাগ্নে' : 'ভাগ্নি')
  if (g === -2) return M(B) ? 'নাতি' : 'নাতনি'
  return null
}

// আত্মীয়ের স্বামী/স্ত্রীর নাম
const SPOUSE_OF = {
  ভাই: 'ভাবি', বোন: 'দুলাভাই', চাচা: 'চাচি', ফুফু: 'ফুপা', মামা: 'মামি', খালা: 'খালু',
  ছেলে: 'পুত্রবধূ (বউমা)', মেয়ে: 'জামাই', নাতি: 'নাতবউ', নাতনি: 'নাতজামাই',
  দাদা: 'দাদি', দাদি: 'দাদা', নানা: 'নানি', নানি: 'নানা', বাবা: 'মা (সৎমা)', মা: 'বাবা (সৎবাবা)',
}
// স্বামী/স্ত্রীর আত্মীয়ের নাম
const OF_WIFE = { বাবা: 'শ্বশুর', মা: 'শাশুড়ি', ভাই: 'শ্যালক', বোন: 'শ্যালিকা' }
const OF_HUSBAND = { বাবা: 'শ্বশুর', মা: 'শাশুড়ি', ভাই: 'দেবর/ভাসুর', বোন: 'ননদ' }

export function makeKinship(fam) {
  const { byId } = fam

  // নিকট পূর্বপুরুষদের মানচিত্র: id → { d: দূরত্ব, from: কোন সন্তানের মাধ্যমে }
  function ancestors(id) {
    const r = new Map([[id, { d: 0, from: null }]]), q = [id]
    while (q.length) {
      const x = q.shift(), v = r.get(x)
      for (const p of fam.parents(byId.get(x))) if (!r.has(p.id)) { r.set(p.id, { d: v.d + 1, from: x }); q.push(p.id) }
    }
    return r
  }
  const pathTo = (map, start, c) => {
    const down = [byId.get(c)]
    let x = c
    while (x !== start) { x = map.get(x).from; down.push(byId.get(x)) }
    return down.reverse()   // [start, …, c]
  }

  // রক্তের সম্পর্ক
  function blood(a, b) {
    if (a === b) return null
    const am = ancestors(a), bm = ancestors(b)
    let best = null
    am.forEach((v, id) => {
      const w = bm.get(id)
      if (w && (!best || v.d + w.d < best.t || (v.d + w.d === best.t && M(byId.get(id)) && !M(byId.get(best.c)))))
        best = { c: id, t: v.d + w.d }
    })
    if (!best) return null
    const aPath = pathTo(am, a, best.c), bPath = pathTo(bm, b, best.c)
    const term = bloodTerm(aPath, bPath)
    const alt = generational(aPath, bPath)
    return { term, alt: alt && alt !== term && !term.endsWith(alt) ? alt : null, dist: best.t, chain: [...aPath, ...bPath.slice(0, -1).reverse()], common: byId.get(best.c) }
  }

  // B হলেন A-এর কী — সব পথ খুঁজে সবচেয়ে কাছেরটা
  function relate(a, b) {
    const A = byId.get(a), B = byId.get(b)
    if (!A || !B) return null
    if (a === b) return { term: 'নিজে', dist: 0, chain: [A] }
    if (fam.spouses(a).some(s => s.id === b)) return { term: M(B) ? 'স্বামী' : 'স্ত্রী', dist: 0, chain: [A, B], marriage: true }

    const options = []
    const bl = blood(a, b)
    if (bl) options.push(bl)

    // B কোনো রক্তের আত্মীয়ের স্বামী/স্ত্রী (চাচি, ভাবি, দুলাভাই…)
    for (const sp of fam.spouses(b)) {
      const r = blood(a, sp.id)
      if (r) options.push({
        term: SPOUSE_OF[r.term] || `${poss(r.term)} ${M(B) ? 'স্বামী' : 'স্ত্রী'}`,
        alt: null, dist: r.dist + 1, chain: [...r.chain, B], marriage: true,
      })
    }
    // B হলেন A-এর স্বামী/স্ত্রীর রক্তের আত্মীয় (শ্বশুর, শ্যালক, ননদ…)
    for (const sp of fam.spouses(a)) {
      const r = blood(sp.id, b)
      if (r) {
        const map = M(A) ? OF_WIFE : OF_HUSBAND
        options.push({
          term: map[r.term] || `${M(A) ? 'স্ত্রীর' : 'স্বামীর'} ${r.term}`,
          alt: null, dist: r.dist + 1, chain: [A, ...r.chain], marriage: true,
        })
      }
    }
    if (!options.length) return null
    options.sort((x, y) => x.dist - y.dist || (x.marriage ? 1 : 0) - (y.marriage ? 1 : 0))
    return options[0]
  }

  return { relate }
}
