import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HOME } from '../lib/districtCoords'
import { bn } from '../lib/util'
import { N, loadGeo } from '../lib/geo'

// শুধু বাংলাদেশের মানচিত্র: জেলা ও উপজেলার সীমানা (কোনো বিশ্ব-মানচিত্র টাইল নেই)
// সীমানার তথ্য: geoBoundaries (geoboundaries.org), CC BY 4.0
const BD = [[20.55, 87.95], [26.7, 92.75]]
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
// আত্মীয় যত বেশি, সবুজ তত গাঢ়
const shade = (n, max) => n ? `hsl(166, 60%, ${Math.round(78 - 48 * Math.min(1, Math.sqrt(n / Math.max(1, max))))}%)` : null

export default function RelativesMap({ groups, selected, onSelect, me }) {
  const box = useRef(), map = useRef(), layers = useRef({}), meDot = useRef(null)
  const [geo, setGeo] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => { loadGeo().then(setGeo, () => setErr(true)) }, [])

  // মানচিত্র একবার তৈরি
  useEffect(() => {
    const m = L.map(box.current, {
      zoomControl: true, attributionControl: true, scrollWheelZoom: false,
      maxBounds: BD, maxBoundsViscosity: 1, minZoom: 6, maxZoom: 11, zoomSnap: 0.25,
    })
    m.fitBounds(BD)
    m.attributionControl.setPrefix(false)
    m.attributionControl.addAttribution('সীমানা © <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a>, CC BY 4.0')
    map.current = m
    const fix = () => { m.invalidateSize(); m.setMinZoom(m.getBoundsZoom(BD)) }
    setTimeout(fix, 100)
    addEventListener('resize', fix)
    return () => { removeEventListener('resize', fix); m.remove() }
  }, [])

  // জেলা/উপজেলা স্তর আঁকা
  useEffect(() => {
    const m = map.current
    if (!m || !geo) return
    Object.values(layers.current).forEach(l => l.remove())

    const count = new Map(groups.map(g => [g.d, g.n]))
    const ups = new Map(groups.map(g => [g.d, new Map(g.ups.map(([u, l]) => [N(u), l.length]))]))
    const max = Math.max(1, ...groups.map(g => g.n))
    const line = css('--line') || '#ccc', pri = css('--pri') || '#0f6b5c', card = css('--card') || '#fff'

    const dist = L.geoJSON(geo[0], {
      style: f => {
        const d = f.properties.d, n = count.get(d) || 0, on = selected === d
        return {
          color: on ? '#b77712' : pri, weight: on ? 3 : 1.2, opacity: 0.9,
          fillColor: on ? '#e8a33d' : shade(n, max) || card, fillOpacity: on ? 0.85 : n ? 0.9 : 0.75,
        }
      },
      onEachFeature: (f, l) => {
        const d = f.properties.d, n = count.get(d) || 0
        l.bindTooltip(n ? `${d} · ${bn(n)}টি পরিবার` : d, { sticky: true, className: 'map-tip' })
        l.on('click', () => n ? onSelect(selected === d ? null : d) : onSelect(null))
      },
    }).addTo(m)

    // উপজেলা: পাতলা দাগ; যেখানে আত্মীয় আছে সেটা রঙিন
    const up = L.geoJSON(geo[1], {
      interactive: true,
      style: f => {
        const hit = ups.get(f.properties.d)?.get(N(f.properties.u))
        return hit
          ? { color: '#e84a86', weight: 1.6, fillColor: '#e84a86', fillOpacity: 0.55 }
          : { color: pri, weight: 0.35, opacity: 0.45, fill: false }
      },
      onEachFeature: (f, l) => {
        const hit = ups.get(f.properties.d)?.get(N(f.properties.u))
        if (hit) {
          l.bindTooltip(`${f.properties.u}, ${f.properties.d} · ${bn(hit)}`, { sticky: true, className: 'map-tip on' })
          l.on('click', () => onSelect(f.properties.d))
        }
      },
    }).addTo(m)

    // যে জেলায় আত্মীয় আছে, তার নাম স্থায়ীভাবে
    const labels = L.layerGroup().addTo(m)
    dist.eachLayer(l => {
      const d = l.feature.properties.d, n = count.get(d)
      if (!n) return
      L.marker(l.getBounds().getCenter(), { interactive: false, icon: L.divIcon({ className: 'map-label' + (selected === d ? ' on' : ''), html: `<span>${d} <b>${bn(n)}</b></span>`, iconSize: null }) }).addTo(labels)
    })

    // আমাদের বাড়ি
    const home = L.circleMarker(HOME.at, { radius: 8, color: '#fff', weight: 3, fillColor: '#e84a86', fillOpacity: 1 })
      .bindTooltip(HOME.name, { permanent: true, direction: 'top', offset: [0, -8], className: 'map-tip home' }).addTo(m)

    layers.current = { dist, up, labels, home }

    if (selected) {
      let b = null
      dist.eachLayer(l => { if (l.feature.properties.d === selected) b = l.getBounds() })
      if (b) m.flyToBounds(b, { padding: [30, 30], maxZoom: 9.5, duration: 0.6 })
    } else m.flyToBounds(BD, { duration: 0.6 })
  }, [geo, groups, selected, onSelect])

  // আমার বর্তমান অবস্থান (নীল বিন্দু)
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (meDot.current) { meDot.current.remove(); meDot.current = null }
    if (me) {
      meDot.current = L.circleMarker(me, { radius: 9, color: '#fff', weight: 3, fillColor: '#2f7fe0', fillOpacity: 1 })
        .bindTooltip('আপনি এখানে', { permanent: true, direction: 'top', offset: [0, -8], className: 'map-tip me' }).addTo(m)
      meDot.current.bringToFront()
    }
  }, [me, geo, groups, selected])

  return (
    <div className="rel-map-wrap">
      <div ref={box} className="rel-map bd-only" role="img" aria-label="বাংলাদেশের মানচিত্রে আত্মীয়দের জেলা ও উপজেলা" />
      {!geo && !err && <div className="map-over">মানচিত্র আসছে…</div>}
      {err && <div className="map-over">মানচিত্রের সীমানা লোড হয়নি। পেইজ আবার খুলুন।</div>}
      <div className="map-legend">
        <span><i style={{ background: 'hsl(166,60%,70%)' }} />কম</span>
        <span><i style={{ background: 'hsl(166,60%,30%)' }} />বেশি আত্মীয়</span>
        <span><i style={{ background: '#e84a86' }} />উপজেলা</span>
        <span><i style={{ background: '#e8a33d' }} />বাছাই করা জেলা</span>
      </div>
    </div>
  )
}
