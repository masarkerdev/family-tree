import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DISTRICT_COORDS, HOME } from '../lib/districtCoords'
import { bn } from '../lib/util'

// বাংলাদেশের মানচিত্রে জেলাভিত্তিক আত্মীয়তা — চিহ্ন যত বড়, তত বেশি পরিবার
export default function RelativesMap({ groups, selected, onSelect }) {
  const box = useRef(), map = useRef(), layer = useRef()

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
    m.fitBounds([[20.6, 88.0], [26.65, 92.7]])
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12, minZoom: 6,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(m)
    // আমাদের বাড়ি
    L.circleMarker(HOME.at, { radius: 9, color: '#fff', weight: 3, fillColor: '#e84a86', fillOpacity: 1 })
      .bindTooltip(HOME.name, { permanent: true, direction: 'top', offset: [0, -8], className: 'map-tip home' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    const fix = () => m.invalidateSize()
    setTimeout(fix, 100)
    addEventListener('resize', fix)
    return () => { removeEventListener('resize', fix); m.remove() }
  }, [])

  useEffect(() => {
    const lg = layer.current
    if (!lg) return
    lg.clearLayers()
    for (const g of groups) {
      const at = DISTRICT_COORDS[g.d]
      if (!at) continue
      const on = selected === g.d
      L.circleMarker(at, {
        radius: 8 + Math.sqrt(g.n) * 5, color: '#fff', weight: 2,
        fillColor: on ? '#e8a33d' : '#0f6b5c', fillOpacity: on ? 0.95 : 0.8,
      })
        .bindTooltip(`${g.d} · ${bn(g.n)}`, { permanent: true, direction: 'right', offset: [6, 0], className: 'map-tip' + (on ? ' on' : '') })
        .on('click', () => onSelect(on ? null : g.d))
        .addTo(lg)
    }
  }, [groups, selected, onSelect])

  return <div ref={box} className="rel-map" role="img" aria-label="বাংলাদেশের মানচিত্রে আত্মীয়দের জেলা" />
}
