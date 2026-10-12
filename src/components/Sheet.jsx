import { useEffect } from 'react'

// নিচ থেকে উঠে আসা প্যানেল
export default function Sheet({ onClose, children, wide }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className={'sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <button className="sheet-x" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
        {children}
      </div>
    </>
  )
}
