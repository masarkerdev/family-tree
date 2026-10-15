// বাংলাদেশের জেলা-উপজেলার সীমানা (public/geo) আর অবস্থান থেকে উপজেলা খোঁজা
// সীমানার তথ্য: geoBoundaries (geoboundaries.org), CC BY 4.0

// বানান মেলানো: ী→ি, ূ→ু, "উপজেলা/থানা" শব্দ ও ফাঁকা জায়গা বাদ
export const N = s => String(s || '').normalize('NFC').replace(/উপজেলা|থানা/g, '')
  .replace(/ী/g, 'ি').replace(/ূ/g, 'ু').replace(/[\s\-.]+/g, '')

let cache = null
export const loadGeo = () => cache || (cache = Promise.all(
  ['districts', 'upazilas'].map(f => fetch(`${import.meta.env.BASE_URL}geo/${f}.json`).then(r => { if (!r.ok) throw new Error(f); return r.json() }))
).catch(e => { cache = null; throw e }))

// বিন্দুটি বহুভুজের ভেতরে কিনা (ray casting) — GeoJSON-এ [দ্রাঘিমা, অক্ষাংশ]
function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inPoly = (x, y, poly) => inRing(x, y, poly[0]) && !poly.slice(1).some(h => inRing(x, y, h))
export function inFeature(lat, lng, f) {
  const g = f.geometry
  if (!g) return false
  if (g.type === 'Polygon') return inPoly(lng, lat, g.coordinates)
  if (g.type === 'MultiPolygon') return g.coordinates.some(p => inPoly(lng, lat, p))
  return false
}

// অবস্থান → { u: উপজেলা, d: জেলা } (বাংলাদেশের বাইরে হলে null)
export async function findPlace(lat, lng) {
  const [dist, up] = await loadGeo()
  const hit = up.features.find(f => inFeature(lat, lng, f))
  if (hit) return { u: hit.properties.u, d: hit.properties.d }
  const dh = dist.features.find(f => inFeature(lat, lng, f))
  return dh ? { u: null, d: dh.properties.d } : null
}

// দুই বিন্দুর দূরত্ব (কিমি)
export function km(a, b) {
  const R = 6371, r = x => (x * Math.PI) / 180
  const dLat = r(b[0] - a[0]), dLng = r(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
