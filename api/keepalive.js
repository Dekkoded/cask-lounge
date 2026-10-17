// Hält das Supabase-Projekt wach: das Free-Tier pausiert nach ~7 Tagen ohne
// Aktivität. Dieser Endpoint macht einen leichten REST-Request und wird von
// Vercel Cron täglich aufgerufen (siehe crons in vercel.json). Vorteil ggü.
// dem GitHub-Actions-Keepalive: Vercel deaktiviert Cron-Jobs NICHT nach 60
// Tagen Repo-Inaktivität – ist also der stabile Backstop.
//
// URL + anon/publishable Key sind öffentlich (stecken bereits im Frontend-
// Bundle, Zugriff ist per RLS geschützt) – daher hier direkt hinterlegt.

const SUPABASE_URL = 'https://yhwenelftfgmwisquqnc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_IZPBsFdeGsNQvj7SezZOpQ_mhUmB8xa'

export default async function handler(_req, res) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/drinks?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
