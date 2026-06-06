import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TopBar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="sticky top-0 z-40 bg-app/90 backdrop-blur border-b border-stone-800/50">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-amber-400 font-bold text-lg tracking-tight"
        >
          Cask Lounge
        </button>
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
          >
            Profil
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">Anmelden</Link>
            <Link to="/signup" className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-3 py-1.5 text-sm">Registrieren</Link>
          </div>
        )}
      </div>
    </div>
  )
}
