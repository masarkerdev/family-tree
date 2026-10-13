import { useEffect, useState } from 'react'
import { useApp } from '../ctx'
import { bn, lifeSpan } from '../lib/util'
import Avatar from './Avatar'
import PanZoom from './PanZoom'

function TNode({ m, depth, openDepth, hit, path, onPick }) {
  const { fam, open } = useApp()
  const kids = fam.treeKids(m.id)
  const sps = fam.spouses(m.id)
  const onPath = path?.has(m.id)
  const [isOpen, setOpen] = useState(depth < openDepth || !!onPath)
  // শিকড়ের পথে থাকলে শাখা নিজে থেকে খুলে যায়
  useEffect(() => { if (onPath && kids.some(k => path.has(k.id))) setOpen(true) }, [onPath, path]) // eslint-disable-line
  const dim = hit && !m.name.includes(hit)
  const pick = id => (onPick ? onPick(id) : open(id))
  return (
    <li className={onPath ? 'on-path' : ''}>
      <div className={'cp' + (sps.length ? ' two' : '')}>
        <button className={'n' + (dim ? ' dim' : '') + (m.status === 'pending' ? ' pend' : '') + (onPath ? ' lit' : '')}
          data-mid={m.id} onClick={() => pick(m.id)}>
          <Avatar m={m} size={58} />
          <span className="nm">{m.name}</span>
          <small>{lifeSpan(m)}{m.status === 'pending' ? ' ⏳' : ''}</small>
        </button>
        {sps.map(s => (
          <button key={s.id} className="n pt" data-mid={s.id} onClick={() => open(s.id)}>
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
        <ul>{kids.map(k => <TNode key={k.id} m={k} depth={depth + 1} openDepth={openDepth} hit={hit} path={path} onPick={onPick} />)}</ul>
      )}
    </li>
  )
}

// বংশবৃক্ষ: শুরুতে কয়েক প্রজন্ম খোলা থাকে, বাকিগুলো + চাপলে খোলে।
// live = টেনে সরানো ও জুম; path = যাঁদের আলো জ্বলবে; onPick = নামে চাপলে কী হবে
export default function Tree({ rootIds, openDepth = 3, hit, live, path, onPick, pzRef }) {
  const { fam } = useApp()
  const roots = rootIds.map(id => fam.byId.get(id)).filter(Boolean)
  if (!roots.length) return <p className="muted">এখনো কেউ নেই।</p>
  const list = <ul className="t">{roots.map(r => <TNode key={r.id} m={r} depth={0} openDepth={openDepth} hit={hit} path={path} onPick={onPick} />)}</ul>
  if (live) return <PanZoom ref={pzRef}>{list}</PanZoom>
  return <div className="tree-scroll">{list}</div>
}
