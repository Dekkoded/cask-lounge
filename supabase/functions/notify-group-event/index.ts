import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// Generische Benachrichtigung für Gruppen-Events. Über Database-Webhooks
// (INSERT) angebunden für:
//   session_comments -> 'comment'
//   group_ratings    -> 'rating'
//   battles          -> 'battle'
// Empfänger werden über profiles.notification_prefs[type] gefiltert
// (Standard = an), E-Mail zusätzlich über profiles.email_notifications.

const TYPE_BY_TABLE: Record<string, string> = {
  session_comments: 'comment',
  group_ratings: 'rating',
  battles: 'battle',
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const table: string = payload.table
    const record = payload.record
    const prefKey = TYPE_BY_TABLE[table]
    if (!record || !prefKey) return new Response('Ignored', { status: 200 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let actorId: string | null = null
    let recipientIds: string[] = []
    let title = ''
    let body = ''
    let url = '/'

    const actorName = async (uid: string | null) => {
      if (!uid) return 'Jemand'
      const { data } = await supabase.from('profiles').select('display_name, username').eq('id', uid).single()
      return data?.display_name ?? data?.username ?? 'Jemand'
    }

    if (table === 'session_comments') {
      actorId = record.user_id
      const { data: session } = await supabase
        .from('drink_sessions')
        .select('user_id, group_id, drink_id, drink_name')
        .eq('id', record.session_id).single()
      if (!session) return new Response('No session', { status: 200 })
      // andere Kommentatoren derselben Session
      const { data: commenters } = await supabase
        .from('session_comments').select('user_id').eq('session_id', record.session_id)
      const ids = new Set<string>([session.user_id, ...(commenters ?? []).map((c: { user_id: string }) => c.user_id)])
      ids.delete(actorId as string)
      recipientIds = [...ids]
      const name = await actorName(actorId)
      title = `${name} hat kommentiert 💬`
      body = record.body ?? ''
      url = session.group_id ? `/groups/${session.group_id}` : '/'
    } else if (table === 'group_ratings') {
      actorId = record.shared_by
      const { data: members } = await supabase
        .from('group_members').select('user_id')
        .eq('group_id', record.group_id).neq('user_id', actorId)
      recipientIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: rating } = await supabase
        .from('ratings').select('drinks(name)').eq('id', record.rating_id).single()
      const drinkName = (rating?.drinks as { name: string } | null)?.name ?? 'einen Whisky'
      const name = await actorName(actorId)
      title = `${name} hat eine Bewertung geteilt ⭐`
      body = drinkName
      url = `/groups/${record.group_id}`
    } else if (table === 'battles') {
      // Öffentliche Battles (ohne Gruppe) lösen keine Benachrichtigung aus
      if (!record.group_id) return new Response('Public battle, no notify', { status: 200 })
      actorId = record.created_by
      const { data: members } = await supabase
        .from('group_members').select('user_id')
        .eq('group_id', record.group_id).neq('user_id', actorId)
      recipientIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
      const name = await actorName(actorId)
      title = `${name} hat ein Battle gestartet ⚔️`
      const { data: bd } = await supabase
        .from('battle_drinks').select('position, drinks(name)').eq('battle_id', record.id).order('position')
      body = (bd ?? [])
        .map((r: { drinks: { name: string } | null }) => r.drinks?.name)
        .filter(Boolean).join(' vs ')
      url = `/battle/${record.id}`
    }

    if (recipientIds.length === 0) return new Response('No recipients', { status: 200 })

    // Präferenzen filtern
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email_notifications, notification_prefs')
      .in('id', recipientIds)

    const wants = (p: { notification_prefs: Record<string, boolean> | null }) =>
      (p.notification_prefs?.[prefKey] ?? true) !== false

    const optedIn = (profiles ?? []).filter(wants)
    const pushIds = optedIn.map((p: { id: string }) => p.id)
    if (pushIds.length === 0) return new Response('No opt-in recipients', { status: 200 })

    // Push senden
    webpush.setVapidDetails(
      'mailto:noreply@casklounge.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )
    const { data: subs } = await supabase
      .from('push_subscriptions').select('subscription').in('user_id', pushIds)
    await Promise.allSettled(
      (subs ?? []).map(row =>
        webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url })),
      ),
    )

    // E-Mail senden (Opt-in + email_notifications)
    const emailIds = optedIn
      .filter((p: { email_notifications: boolean }) => p.email_notifications !== false)
      .map((p: { id: string }) => p.id)

    const emails: string[] = []
    for (const uid of emailIds) {
      const { data: { user } } = await supabase.auth.admin.getUserById(uid)
      if (user?.email) emails.push(user.email)
    }

    if (emails.length > 0) {
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #1c1917; color: #e7e5e4; padding: 32px; border-radius: 16px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0 0 8px;">Cask Lounge</h1>
          <h2 style="font-size: 20px; margin: 0 0 16px;">${title}</h2>
          ${body ? `<p style="font-size: 16px; color: #d6d3d1;">${body}</p>` : ''}
          <p style="color: #57534e; font-size: 12px; margin-top: 32px;">Cask Lounge · casklounge.com</p>
        </div>
      `
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Cask Lounge <noreply@casklounge.com>',
          to: emails,
          subject: title,
          html,
        }),
      })
    }

    return new Response(JSON.stringify({ ok: true, recipients: pushIds.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err), { status: 500 })
  }
})
