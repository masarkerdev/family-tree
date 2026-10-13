// খেলার প্রশ্ন তৈরি — সব বংশতালিকা থেকে নিজে নিজে
import { shuffle } from './util'
import { makeKinship, poss } from './kinship'

const approved = fam => fam.members.filter(m => m.status === 'approved')
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const person = m => ({ key: m.id, label: m.name, m })

// সঠিক উত্তরের সাথে আরও ৩টি ভুল বিকল্প (একই লিঙ্গের হলে ভালো)
function withDistractors(fam, answer, exclude = []) {
  const pool = approved(fam).filter(p => p.id !== answer.id && !exclude.some(e => e.id === p.id))
  const same = pool.filter(p => p.gender === answer.gender)
  const others = shuffle(same.length >= 3 ? same : pool).slice(0, 3)
  return others.length === 3 ? shuffle([answer, ...others]).map(person) : null
}

// ১. আমি কে? — বাবা, মা, দাদা, নানা, সন্তান, গল্পের সূত্র
export function whoAmI(fam) {
  const qs = []
  for (const m of approved(fam)) {
    const f = fam.byId.get(m.father_id), mo = fam.byId.get(m.mother_id)
    if (f) {
      qs.push({ q: `${poss(m.name)} বাবা কে?`, a: f, ex: [m] })
      const g = fam.byId.get(f.father_id)
      if (g) qs.push({ q: `${poss(m.name)} দাদা (বাবার বাবা) কে?`, a: g, ex: [m, f] })
    }
    if (mo) {
      qs.push({ q: `${poss(m.name)} মা কে?`, a: mo, ex: [m] })
      const n = fam.byId.get(mo.father_id)
      if (n) qs.push({ q: `${poss(m.name)} নানা (মায়ের বাবা) কে?`, a: n, ex: [m, mo] })
    }
    const ks = fam.kids(m.id)
    if (ks.length) qs.push({ q: `নিচের কে ${poss(m.name)} সন্তান?`, a: pick(ks), ex: [m, ...ks, ...fam.parents(m)] })
    if (m.bio && m.is_deceased && m.bio.length > 20) {
      const clue = m.bio.split(m.name).join('তিনি').slice(0, 110)
      qs.push({ q: `"${clue}${m.bio.length > 110 ? '…' : ''}" — ইনি কে?`, a: m, ex: [] })
    }
  }
  return qs.map(x => ({ q: x.q, opts: withDistractors(fam, x.a, x.ex), answer: x.a.id, about: x.a.id })).filter(x => x.opts)
}

// ২. সম্পর্ক বলো — "ক হলেন খ-এর কী?"
const TERMS_M = ['বাবা', 'ছেলে', 'ভাই', 'চাচা', 'মামা', 'দাদা', 'নানা', 'নাতি', 'ভাতিজা', 'ভাগ্নে', 'চাচাতো ভাই', 'মামাতো ভাই', 'ফুফাতো ভাই', 'খালাতো ভাই', 'ফুপা', 'খালু', 'দুলাভাই', 'জামাই', 'শ্বশুর']
const TERMS_F = ['মা', 'মেয়ে', 'বোন', 'ফুফু', 'খালা', 'দাদি', 'নানি', 'নাতনি', 'ভাতিজি', 'ভাগ্নি', 'চাচাতো বোন', 'মামাতো বোন', 'ফুফাতো বোন', 'খালাতো বোন', 'চাচি', 'মামি', 'ভাবি', 'পুত্রবধূ (বউমা)', 'শাশুড়ি']

export function relationQuiz(fam) {
  const kin = makeKinship(fam), qs = [], seen = new Set()
  const near = m => {
    const set = new Set()
    const add = list => list.forEach(x => x && x.id !== m.id && set.add(x))
    const ps = fam.parents(m)
    add(ps); add(fam.kids(m.id)); add(fam.spouses(m.id))
    ps.forEach(p => { add(fam.kids(p.id)); const gp = fam.parents(p); add(gp); gp.forEach(g => add(fam.kids(g.id))) })
    fam.kids(m.id).forEach(k => add(fam.kids(k.id)))
    ps.forEach(p => fam.kids(p.id).forEach(s => { add(fam.kids(s.id)); add(fam.spouses(s.id)) }))
    ps.forEach(p => fam.parents(p).forEach(g => fam.kids(g.id).forEach(u => { add(fam.kids(u.id)); add(fam.spouses(u.id)) })))
    return [...set].filter(x => x.status === 'approved')
  }
  for (const a of shuffle(approved(fam)).slice(0, 60)) {
    for (const b of shuffle(near(a)).slice(0, 4)) {
      const r = kin.relate(a.id, b.id)
      if (!r) continue
      const terms = b.gender === 'female' ? TERMS_F : TERMS_M
      if (!terms.includes(r.term) || seen.has(a.id + b.id)) continue
      seen.add(a.id + b.id)
      const wrong = shuffle(terms.filter(t => t !== r.term)).slice(0, 3)
      qs.push({
        q: `${b.name} হলেন ${poss(a.name)} কী?`,
        opts: shuffle([r.term, ...wrong]).map(t => ({ key: t, label: t })),
        answer: r.term, about: b.id,
      })
    }
  }
  return qs
}

// ৩. কে আগের প্রজন্মের?
export function olderGen(fam) {
  const L = approved(fam).filter(m => m.in_lineage)
  const depth = new Map(L.map(m => [m.id, fam.rootPath(m.id).length]))
  const qs = []
  for (let i = 0; i < 40 && L.length > 1; i++) {
    const a = pick(L), b = pick(L)
    if (a.id === b.id || depth.get(a.id) === depth.get(b.id)) continue
    const older = depth.get(a.id) < depth.get(b.id) ? a : b
    qs.push({ q: 'এই দুজনের মধ্যে কে আগের প্রজন্মের?', opts: shuffle([a, b]).map(person), answer: older.id, about: older.id })
  }
  return qs
}

// ৪. বংশ নম্বর কার?
export function codeQuiz(fam) {
  const L = approved(fam).filter(m => fam.code(m) && fam.code(m) !== '০')
  return L.map(m => {
    const code = fam.code(m), len = code.split('.').length
    const pool = L.filter(x => x.id !== m.id)
    const close = pool.filter(x => fam.code(x).split('.').length === len)
    const others = shuffle(close.length >= 3 ? close : pool).slice(0, 3)
    return others.length === 3
      ? { q: `বংশ নম্বর ${code} কার?`, opts: shuffle([m, ...others]).map(person), answer: m.id, about: m.id, hint: 'বংশ নম্বরের প্রতিটা অংশ বলে কততম ছেলে: ০.১.২ মানে প্রথম পুরুষের ১ম ছেলের ২য় ছেলে।' }
      : null
  }).filter(Boolean)
}

// ৫. ছবি চেনো
export function photoQuiz(fam, photos = []) {
  const out = []
  for (const m of approved(fam).filter(x => x.photo_url)) {
    const opts = withDistractors(fam, m)
    if (opts) out.push({ q: 'ছবির মানুষটি কে?', img: m.photo_url, opts: opts.map(o => ({ ...o, m: null })), answer: m.id, about: m.id })
  }
  // অ্যালবামের যে ছবিতে একজনই ট্যাগ করা
  for (const p of photos.filter(x => x.status === 'approved' && x.tags.length === 1)) {
    const m = fam.byId.get(p.tags[0])
    const opts = m && withDistractors(fam, m)
    if (opts) out.push({ q: 'ছবিতে কে আছেন?', img: p.url, opts: opts.map(o => ({ ...o, m: null })), answer: m.id, about: m.id })
  }
  return out
}

// ৬. জোড়া মেলাও — ৪ জন সন্তান আর তাঁদের বাবা/মা
export function pairRound(fam) {
  const kids = shuffle(approved(fam).filter(m => fam.byId.get(m.father_id)?.status === 'approved'))
  const used = new Set(), pairs = []
  for (const k of kids) {
    const f = fam.byId.get(k.father_id)
    if (used.has(f.id) || used.has(k.id)) continue
    used.add(f.id); used.add(k.id)
    pairs.push({ kid: k, parent: f })
    if (pairs.length === 4) break
  }
  return pairs.length === 4 ? pairs : null
}
