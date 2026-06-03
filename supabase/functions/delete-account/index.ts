import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Aufrufer anhand des Tokens verifizieren — man kann nur sich selbst löschen
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uid = user.id

    // Abhängige Daten in Reihenfolge löschen (FKs könnten kaskadieren, hier defensiv)
    await admin.from('push_subscriptions').delete().eq('user_id', uid)
    await admin.from('group_ratings').delete().eq('shared_by', uid)
    await admin.from('ratings').delete().eq('user_id', uid)
    await admin.from('drink_sessions').delete().eq('user_id', uid)
    await admin.from('group_members').delete().eq('user_id', uid)
    // Gruppen, die dem User gehören, mitlöschen (sonst blockiert evtl. der FK)
    await admin.from('groups').delete().eq('owner_id', uid)
    await admin.from('profiles').delete().eq('id', uid)

    // Zuletzt den Auth-User selbst löschen
    const { error: delErr } = await admin.auth.admin.deleteUser(uid)
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
