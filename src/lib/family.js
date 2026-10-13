import { bn, bn2, birthYear } from './util'

const BRANCH_HUES = [150, 25, 285, 200, 340, 45, 100, 240]

// সব সদস্য ও বিয়ে থেকে সম্পর্কের মানচিত্র বানায়
export function buildFamily(members, marriages) {
  const byId = new Map(members.map(m => [m.id, m]))
  const ord = (a, b) =>
    (a.sort_order - b.sort_order) ||
    ((birthYear(a) || 9999) - (birthYear(b) || 9999)) ||
    String(a.created_at).localeCompare(String(b.created_at))

  const kidsMap = new Map(), treeMap = new Map(), primOf = new Map(), spouseMap = new Map()
  const add = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v) }

  for (const m of members) {
    for (const p of [m.father_id, m.mother_id]) if (p && byId.has(p)) add(kidsMap, p, m)
    // গাছে কার নিচে বসবে: বংশের বাবা থাকলে বাবার নিচে, না হলে বংশের মায়ের নিচে (মেয়ের ঘরের সন্তান)
    const f = byId.get(m.father_id), mo = byId.get(m.mother_id)
    const prim = f && f.in_lineage ? f : mo && mo.in_lineage ? mo : null
    if (prim) { add(treeMap, prim.id, m); primOf.set(m.id, prim.id) }
  }
  for (const l of kidsMap.values()) l.sort(ord)
  for (const l of treeMap.values()) l.sort(ord)

  for (const r of marriages) {
    const h = byId.get(r.husband_id), w = byId.get(r.wife_id)
    if (h && w) { add(spouseMap, h.id, w); add(spouseMap, w.id, h) }
  }

  const roots = members.filter(m => m.in_lineage && !primOf.has(m.id)).sort(ord)
  const kids = id => kidsMap.get(id) || []
  const treeKids = id => treeMap.get(id) || []
  const spouses = id => spouseMap.get(id) || []
  const parents = m => [byId.get(m.father_id), byId.get(m.mother_id)].filter(Boolean)

  // বংশ নম্বর (০.১.২.১.১): পুত্রধারায় প্রতিটি ছেলের ক্রম
  const codeMemo = new Map()
  function code(m) {
    if (!m || m.gender !== 'male' || !m.in_lineage) return null
    if (codeMemo.has(m.id)) return codeMemo.get(m.id)
    let c = null
    const f = byId.get(m.father_id)
    if (!f) c = '০'
    else if (f.in_lineage) {
      const pc = code(f)
      if (pc) c = `${pc}.${bn(kids(f.id).filter(k => k.father_id === f.id && k.gender === 'male').indexOf(m) + 1)}`
    }
    codeMemo.set(m.id, c)
    return c
  }

  function descendants(id, s = new Set()) {
    for (const k of treeKids(id)) if (!s.has(k.id)) { s.add(k.id); descendants(k.id, s) }
    return s
  }
  const genMemo = new Map()
  function generations(id, guard = new Set()) {
    if (genMemo.has(id)) return genMemo.get(id)
    if (guard.has(id)) return 1
    guard.add(id)
    const g = 1 + Math.max(0, ...treeKids(id).map(k => generations(k.id, guard)))
    genMemo.set(id, g)
    return g
  }

  // বংশের কোন শাখার (প্রথম পুরুষের কোন সন্তানের) অংশ
  function branchOf(m) {
    let x = m, seen = new Set()
    while (x && primOf.has(x.id) && !seen.has(x.id)) {
      seen.add(x.id)
      const p = byId.get(primOf.get(x.id))
      if (!primOf.has(p.id)) return x
      x = p
    }
    return x
  }
  const branchHue = m => {
    if (!m.in_lineage) {
      const s = spouses(m.id).find(p => p.in_lineage)
      if (s) m = s
    }
    const b = branchOf(m)
    if (!b) return 160
    const root = byId.get(primOf.get(b.id))
    if (!root) return 160
    const i = treeKids(root.id).indexOf(b)
    return BRANCH_HUES[i % BRANCH_HUES.length]
  }

  const sub = m => {
    const f = byId.get(m.father_id) || byId.get(m.mother_id)
    return [code(m), f ? `${f.gender === 'female' ? 'মা' : 'পিতা'}: ${f.name}` : null].filter(Boolean).join(' · ')
  }

  const kidCount = id => {
    const k = kids(id)
    const s = k.filter(x => x.gender === 'male').length, d = k.filter(x => x.gender === 'female').length
    return [s ? `${bn2(s)} ছেলে` : '', d ? `${bn2(d)} মেয়ে` : ''].filter(Boolean).join(', ')
  }

  // দুজন মানুষের সম্পর্ক (বাবা ও মা দুই দিক ধরে)
  function ancestorMap(id) {
    const r = new Map([[id, { d: 0, via: null }]]), q = [id]
    while (q.length) {
      const x = q.shift(), v = r.get(x)
      for (const p of parents(byId.get(x))) {
        if (!r.has(p.id)) { r.set(p.id, { d: v.d + 1, via: v.d === 0 ? p.id : v.via }); q.push(p.id) }
      }
    }
    return r
  }

  function relation(aId, bId) {
    const A = byId.get(aId), B = byId.get(bId)
    if (!A || !B) return ''
    if (aId === bId) return 'একই মানুষ! 😄'
    if (spouses(aId).some(s => s.id === bId)) return `${A.name} ও ${B.name} স্বামী-স্ত্রী।`
    const am = ancestorMap(aId), bm = ancestorMap(bId)
    let s = null
    am.forEach((v, id) => {
      const w = bm.get(id)
      if (w && (!s || v.d + w.d < s.t)) s = { id, n: v.d, m: w.d, t: v.d + w.d, va: v.via, vb: w.via }
    })
    if (!s) return 'এই দুজনের কোনো সাধারণ পূর্বপুরুষ এখনো বংশতালিকায় পাওয়া যায়নি।'
    const P = byId.get(s.id).name, { n, m } = s
    const g = x => byId.get(x)?.gender
    const desc = (top, low, d) =>
      d === 1 ? `${low.name} হলেন ${top.name}-এর ${low.gender === 'female' ? 'মেয়ে' : 'ছেলে'}।`
        : d === 2 ? `${low.name} হলেন ${top.name}-এর ${low.gender === 'female' ? 'নাতনি' : 'নাতি'}।`
          : `${low.name} হলেন ${top.name}-এর ${bn(d)} প্রজন্ম পরের বংশধর।`
    if (n === 0) return desc(A, B, m)
    if (m === 0) return desc(B, A, n)
    if (n === 1 && m === 1) return `${A.name} ও ${B.name} ভাই-বোন (একই ${byId.get(s.id).gender === 'female' ? 'মায়ের' : 'বাবার'} সন্তান)।`
    const uncle = (U, viaGender) => {
      const male = U.gender !== 'female'
      return viaGender === 'female' ? (male ? 'মামা' : 'খালা') : (male ? 'চাচা' : 'ফুফু')
    }
    if (n === 1 && m === 2) return `${A.name} হলেন ${B.name}-এর ${uncle(A, g(s.vb))}।`
    if (n === 2 && m === 1) return `${B.name} হলেন ${A.name}-এর ${uncle(B, g(s.va))}।`
    if (n === 2 && m === 2) {
      const x = g(s.va), y = g(s.vb)
      const kind = x === 'male' && y === 'male' ? 'চাচাতো' : x === 'female' && y === 'female' ? 'খালাতো' : 'মামাতো-ফুফাতো'
      return `${A.name} ও ${B.name} ${kind} ভাই-বোন। সাধারণ পূর্বপুরুষ ${P}।`
    }
    if (n === m) return `সাধারণ পূর্বপুরুষ ${P}। দুজনেই তাঁর ${bn(n)} প্রজন্ম পরের, অর্থাৎ একই প্রজন্মের আত্মীয়।`
    return `সাধারণ পূর্বপুরুষ ${P}। ${A.name} তাঁর ${bn(n)} প্রজন্ম পরের, ${B.name} ${bn(m)} প্রজন্ম পরের।`
  }

  const maxGen = roots.length ? Math.max(...roots.map(r => generations(r.id))) : 0

  // গাছে কার নিচে বসেছেন (বংশের বাবা, না থাকলে বংশের মা)
  const treeParent = id => byId.get(primOf.get(id)) || null
  // নিজের থেকে বংশের প্রথম পুরুষ পর্যন্ত পথ: [নিজে, বাবা/মা, দাদা/নানা, …]
  function rootPath(id) {
    const out = [], seen = new Set()
    let x = byId.get(id)
    while (x && !seen.has(x.id)) { seen.add(x.id); out.push(x); x = treeParent(x.id) }
    return out
  }

  return {
    members, byId, roots, kids, treeKids, spouses, parents, code, descendants, generations,
    branchOf, branchHue, sub, kidCount, relation, maxGen, treeParent, rootPath,
  }
}
