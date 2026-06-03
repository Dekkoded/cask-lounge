import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (username.length < 3) {
      setError('Benutzername muss mindestens 3 Zeichen lang sein.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Direkt nach Signup anmelden (Supabase bestätigt Session automatisch bei deaktivierter E-Mail-Bestätigung)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-400 mb-2 text-center">🥃 Whisky is Life</h1>
        <p className="text-stone-400 text-center mb-8">Konto erstellen</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Benutzername</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="z. B. leon"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="du@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Passwort</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="mind. 6 Zeichen"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            {loading ? 'Konto wird erstellt…' : 'Konto erstellen'}
          </button>
        </form>

        <p className="text-stone-500 text-sm text-center mt-6">
          Schon ein Konto?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
