import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '../ctx'
import Avatar from './Avatar'

// হোম পেইজে সবার ছবি ডানে-বামে নিজে নিজে চলে; হাত/মাউস রাখলে থামে, টেনে সরানো যায়
export default function FaceStrip() {
  const { fam, open } = useApp()
  const ref = useRef(), pause = useRef(false), pos = useRef(0)
  const list = useMemo(() => {
    // ছবি থাকা সদস্যরা আগে, তারপর বাকিরা
    const a = fam.members.filter(m => m.status === 'approved')
    return [...a.filter(m => m.photo_url), ...a.filter(m => !m.photo_url)]
  }, [fam])
  const loop = list.length > 6

  useEffect(() => {
    if (!loop || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const tick = () => {
      const el = ref.current
      if (el) {
        const half = el.scrollWidth / 2
        if (pause.current) pos.current = el.scrollLeft
        else pos.current += 0.5
        if (pos.current >= half) pos.current -= half
        if (!pause.current || el.scrollLeft >= half) el.scrollLeft = pos.current
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [loop, list])

  const timer = useRef()
  const hold = () => { clearTimeout(timer.current); pause.current = true }
  const release = () => { clearTimeout(timer.current); timer.current = setTimeout(() => (pause.current = false), 1500) }
  const card = (m, k) => (
    <button key={k} className="fc" onClick={() => open(m.id)} tabIndex={k.startsWith('b') ? -1 : 0}>
      <span className="ring"><Avatar m={m} size={78} /></span>
      <span className="fn">{m.name}</span>
    </button>
  )

  return (
    <div className="fs" ref={ref}
      onPointerEnter={hold} onPointerLeave={release} onPointerDown={hold} onPointerUp={release}
      onTouchStart={hold} onTouchEnd={release} onFocus={hold} onBlur={release}>
      {list.map(m => card(m, 'a' + m.id))}
      {loop && list.map(m => card(m, 'b' + m.id))}
    </div>
  )
}
