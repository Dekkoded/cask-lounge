import { Link } from 'react-router-dom'

export default function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-xs text-stone-600 ${className}`}>
      <Link to="/impressum" className="hover:text-stone-400 transition-colors">Impressum</Link>
      <span>·</span>
      <Link to="/datenschutz" className="hover:text-stone-400 transition-colors">Datenschutz</Link>
      <span>·</span>
      <Link to="/agb" className="hover:text-stone-400 transition-colors">AGB</Link>
    </div>
  )
}
