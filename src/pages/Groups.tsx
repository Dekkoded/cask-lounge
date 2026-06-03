import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Group {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
  created_at: string
}

export default function Groups() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const loadGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })
    setGroups(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    setCreateError(null)

    const { data: groupId, error } = await supabase
      .rpc('create_group', {
        p_name: newName.trim(),
        p_description: newDesc.trim() || null,
      })

    if (error) { setCreateError(error.message); setCreating(false); return }

    const group = { id: groupId as string }

    navigate(`/groups/${group.id}`)
  }

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setJoining(true)
    setJoinError(null)

    const { data: groupId, error } = await supabase
      .rpc('join_group', { p_invite_code: joinCode.trim() })

    if (error || !groupId) {
      setJoinError(error?.message === 'Gruppe nicht gefunden' ? 'Kein Gruppe mit diesem Code gefunden.' : (error?.message ?? 'Fehler beim Beitreten.'))
      setJoining(false)
      return
    }

    navigate(`/groups/${groupId}`)
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between py-4 mb-6">
        <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm">← Zurück</button>
        <h1 className="text-xl font-bold text-amber-400">Meine Gruppen</h1>
        <div />
      </div>

      {/* Gruppen-Liste */}
      {loading ? (
        <div className="flex flex-col gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-stone-900 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-stone-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-stone-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-stone-500 text-center py-8">Du bist noch in keiner Gruppe.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {groups.map(g => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
            >
              <p className="font-semibold text-stone-100">{g.name}</p>
              {g.description && <p className="text-sm text-stone-400 mt-0.5">{g.description}</p>}
              <p className="text-xs text-stone-600 mt-1">Code: {g.invite_code}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Gruppe erstellen */}
      <div className="bg-stone-900 rounded-2xl p-5 mb-4">
        <button
          onClick={() => setShowCreate(v => !v)}
          className="w-full text-left font-semibold text-stone-200 flex justify-between items-center"
        >
          <span>+ Neue Gruppe erstellen</span>
          <span className="text-stone-500">{showCreate ? '▲' : '▼'}</span>
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-4">
            <input
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Gruppenname"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Beschreibung (optional)"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            {createError && <p className="text-red-400 text-sm">{createError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
            >
              {creating ? 'Wird erstellt…' : 'Gruppe erstellen'}
            </button>
          </form>
        )}
      </div>

      {/* Per Code beitreten */}
      <div className="bg-stone-900 rounded-2xl p-5">
        <p className="font-semibold text-stone-200 mb-3">Per Code beitreten</p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            required
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Einladungscode"
            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="submit"
            disabled={joining}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
          >
            {joining ? '…' : 'Beitreten'}
          </button>
        </form>
        {joinError && <p className="text-red-400 text-sm mt-2">{joinError}</p>}
      </div>
    </div>
  )
}
