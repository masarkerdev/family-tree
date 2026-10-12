import { useState } from 'react'
import { useApp } from '../ctx'
import { bn, lifeSpan } from '../lib/util'
import Avatar from './Avatar'

function TNode({ m, depth, openDepth, hit }) {
  const { fam, open } = useApp()
  const kids = fam.treeKids(m.id)
  const sps = fam.spouses(m.id)
  const [isOpen, setOpen] = useState(depth < openDepth)
  const dim = hit && !m.name.includes(hit)
  return (
    <li>
      <div className={'cp' + (sps.length ? ' two' : '')}>
        <button className={'n' + (dim ? ' dim' : '') + (m.status === 'pending' ? ' pend' : '')} onClick={() => open(m.id)}>
          <Avatar m={m} size={58} />
          <span className="nm">{m.name}</span>
          <small>{lifeSpan(m)}{m.status === 'pending' ? ' ⏳' : ''}</small>
        </button>
        {sps.map(s => (
          <button key={s.id} className="n pt" onClick={() => open(s.id)}>
            <Avatar m={s} size={40} />
            <span className="nm">{s.name}</span>
          </button>
        ))}
        {kids.length > 0 && (
          <button className={'tg' + (isOpen ? '' : ' closed')} onClick={() => setOpen(!isOpen)}
            aria-label={isOpen ? 'শাখা গুটিয়ে নিন' : 'শাখা খুলুন'}>
            {isOpen ? '−' : `+${bn(kids.length)}`}
          </button>
        )}
      </div>
      {isOpen && kids.length > 0 && (
        <ul>{kids.map(k => <TNode key={k.id} m={k} depth={depth + 1} openDepth={openDepth} hit={hit} />)}</ul>
      )}
    </li>
  )
}

// বংশবৃক্ষ: শুরুতে কয়েক প্রজন্ম খোলা থাকে, বাকিগুলো + চাপলে খোলে
export default function Tree({ rootIds, openDepth = 3, hit }) {
  const { fam } = useApp()
  const roots = rootIds.map(id => fam.byId.get(id)).filter(Boolean)
  if (!roots.length) return <p className="muted">এখনো কেউ নেই।</p>
  return (
    <div className="tree-scroll">
      <ul className="t">{roots.map(r => <TNode key={r.id} m={r} depth={0} openDepth={openDepth} hit={hit} />)}</ul>
    </div>
  )
}
