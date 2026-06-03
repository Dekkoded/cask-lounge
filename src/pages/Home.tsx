import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-4xl font-bold text-amber-400">🥃 Whisky is Life</h1>
      <p className="text-stone-300">
        Eingeloggt als <span className="text-amber-400 font-medium">{user?.email}</span>
      </p>
      <p className="text-stone-500 text-sm">Phase 1 erfolgreich — Auth funktioniert!</p>
      <button
        onClick={signOut}
        className="mt-4 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg px-4 py-2 text-sm transition-colors"
      >
        Abmelden
      </button>
    </div>
  )
}
