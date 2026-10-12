import { useApp } from '../ctx'

export default function Avatar({ m, size = 56 }) {
  const { fam } = useApp()
  if (m.photo_url)
    return <img className="av-img" src={m.photo_url} alt={m.name} loading="lazy" style={{ width: size, height: size }} />
  return (
    <span className="av" aria-hidden="true"
      style={{ '--h': fam.branchHue(m), width: size, height: size, fontSize: size * 0.42 }}>
      {[...(m.name || '?')][0]}
    </span>
  )
}
