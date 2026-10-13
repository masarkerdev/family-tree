import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// জীবন্ত বংশবৃক্ষের জমিন: আঙুল বা মাউসে টেনে সরানো, দুই আঙুলে / চাকা ঘুরিয়ে জুম
const MIN = 0.25, MAX = 2.5

const PanZoom = forwardRef(function PanZoom({ children }, ref) {
  const box = useRef(), stage = useRef()
  const [v, setV] = useState({ x: 0, y: 0, s: 1 })
  const view = useRef(v); view.current = v
  const pts = useRef(new Map())
  const gesture = useRef(null)
  const moved = useRef(false)

  const clamp = s => Math.min(MAX, Math.max(MIN, s))
  // কোনো বিন্দুকে স্থির রেখে জুম
  const zoomAt = useCallback((s2, cx, cy) => setV(p => {
    const s = clamp(s2), k = s / p.s
    return { s, x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }
  }), [])

  const center = useCallback(() => {
    const b = box.current, st = stage.current
    if (!b || !st) return
    const w = st.scrollWidth, s = clamp(Math.min(1, (b.clientWidth - 24) / w))
    setV({ s, x: (b.clientWidth - w * s) / 2, y: 16 })
  }, [])

  // নির্দিষ্ট সদস্যকে পর্দার মাঝখানে আনা
  const focus = useCallback(id => {
    const b = box.current
    const el = b?.querySelector(`[data-mid="${id}"]`)
    if (!el) return
    const br = b.getBoundingClientRect(), er = el.getBoundingClientRect()
    setV(p => {
      const s = Math.max(p.s, 0.8), k = s / p.s
      const ex = (er.left + er.width / 2 - br.left - p.x) * k, ey = (er.top + er.height / 2 - br.top - p.y) * k
      return { s, x: b.clientWidth / 2 - ex, y: b.clientHeight / 2.6 - ey }
    })
  }, [])

  useImperativeHandle(ref, () => ({ center, focus, zoom: f => { const b = box.current; zoomAt(view.current.s * f, b.clientWidth / 2, b.clientHeight / 2) } }), [center, focus, zoomAt])
  useEffect(() => { const t = setTimeout(center, 50); return () => clearTimeout(t) }, [center])

  useEffect(() => {
    const b = box.current
    const wheel = e => {
      e.preventDefault()
      const r = b.getBoundingClientRect()
      if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoomAt(view.current.s * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
      else setV(p => ({ ...p, x: p.x - e.deltaX }))
    }
    b.addEventListener('wheel', wheel, { passive: false })
    return () => b.removeEventListener('wheel', wheel)
  }, [zoomAt])

  const down = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const r = box.current.getBoundingClientRect(), p = [...pts.current.values()]
    if (p.length === 1) { gesture.current = { x0: p[0].x, y0: p[0].y, v0: view.current }; moved.current = false }
    if (p.length === 2) gesture.current = {
      d0: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), v0: view.current,
      cx: (p[0].x + p[1].x) / 2 - r.left, cy: (p[0].y + p[1].y) / 2 - r.top,
    }
  }
  const move = e => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current, p = [...pts.current.values()]
    if (!g) return
    if (p.length === 1 && g.x0 !== undefined) {
      const dx = p[0].x - g.x0, dy = p[0].y - g.y0
      if (!moved.current && Math.hypot(dx, dy) < 6) return
      if (!moved.current) { moved.current = true; box.current.setPointerCapture?.(e.pointerId) }
      setV({ ...g.v0, x: g.v0.x + dx, y: g.v0.y + dy })
    } else if (p.length === 2 && g.d0) {
      moved.current = true
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)
      const s = clamp(g.v0.s * d / g.d0), k = s / g.v0.s
      setV({ s, x: g.cx - (g.cx - g.v0.x) * k, y: g.cy - (g.cy - g.v0.y) * k })
    }
  }
  const up = e => {
    pts.current.delete(e.pointerId)
    if (pts.current.size === 1) { const p = [...pts.current.values()][0]; gesture.current = { x0: p.x, y0: p.y, v0: view.current } }
    else if (!pts.current.size) gesture.current = null
  }
  // টেনে সরানোর পর হাত ছাড়লে যেন ভুল করে কারো পেইজ না খুলে যায়
  const clickCapture = e => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false } }

  return (
    <div className="pz" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={clickCapture}>
      <div className="pz-stage" ref={stage} style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.s})` }}>{children}</div>
      <div className="pz-ctl" onPointerDown={e => e.stopPropagation()}>
        <button type="button" aria-label="বড় করুন" onClick={() => { const b = box.current; zoomAt(v.s * 1.25, b.clientWidth / 2, b.clientHeight / 2) }}>＋</button>
        <button type="button" aria-label="ছোট করুন" onClick={() => { const b = box.current; zoomAt(v.s / 1.25, b.clientWidth / 2, b.clientHeight / 2) }}>−</button>
        <button type="button" aria-label="পুরো গাছ দেখুন" onClick={center}>⤢</button>
      </div>
    </div>
  )
})

export default PanZoom
