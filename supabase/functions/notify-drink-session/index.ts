import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record) return new Response('No record', { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Trinkender laden
    const { data: drinker } = await supabase
      .from('profiles').select('display_name, username').eq('id', record.user_id).single()

    // Whisky-Name ermitteln
    let drinkName = record.drink_name
    if (!drinkName && record.drink_id) {
      const { data: drink } = await supabase
        .from('drinks').select('name').eq('id', record.drink_id).single()
      drinkName = drink?.name
    }

    // Empfänger ermitteln
    let memberIds: string[] = []
    if (record.group_id) {
      // An eine bestimmte Gruppe (Alt-Verhalten)
      const { data: members } = await supabase
        .from('group_members').select('user_id')
        .eq('group_id', record.group_id)
        .neq('user_id', record.user_id)
      memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
    } else {
      // An alle, mit denen der Trinkende eine Gruppe teilt
      const { data: myGroups } = await supabase
        .from('group_members').select('group_id').eq('user_id', record.user_id)
      const groupIds = (myGroups ?? []).map((g: { group_id: string }) => g.group_id)
      if (groupIds.length > 0) {
        const { data: members } = await supabase
          .from('group_members').select('user_id')
          .in('group_id', groupIds)
          .neq('user_id', record.user_id)
        memberIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))]
      }
    }

    if (memberIds.length === 0) return new Response('No members to notify', { status: 200 })

    // Empfänger-Profile laden (granulare Präferenzen + E-Mail-Schalter).
    // notification_prefs.live === false bedeutet: keine Live-Benachrichtigung.
    const { data: recipientProfiles } = await supabase
      .from('profiles')
      .select('id, email_notifications, notification_prefs')
      .in('id', memberIds)

    const wantsLive = (p: { notification_prefs: Record<string, boolean> | null }) =>
      (p.notification_prefs?.live ?? true) !== false

    const liveProfiles = (recipientProfiles ?? []).filter(wantsLive)
    const pushIds = liveProfiles.map((p: { id: string }) => p.id)
    if (pushIds.length === 0) return new Response('No recipients opted in', { status: 200 })

    const drinkerName = drinker?.display_name ?? drinker?.username ?? 'Jemand'
    const title = `${drinkerName} trinkt gerade 🥃`
    const body = `${drinkName ?? 'einen Whisky'}`

    // VAPID konfigurieren
    webpush.setVapidDetails(
      'mailto:noreply@casklounge.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    // Push-Subscriptions der Mitglieder holen & senden (nur Opt-in)
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', pushIds)

    const pushResults = await Promise.allSettled(
      (subs ?? []).map(row =>
        webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url: '/' }))
      )
    )
    console.log('Push results:', pushResults.length)

    // E-Mail-Adressen holen — nur wer Live-Opt-in UND E-Mail aktiviert hat
    const emailEnabledIds = liveProfiles
      .filter((p: { email_notifications: boolean }) => p.email_notifications !== false)
      .map((p: { id: string }) => p.id)

    const emails: string[] = []
    for (const uid of emailEnabledIds) {
      const { data: { user } } = await supabase.auth.admin.getUserById(uid)
      if (user?.email) emails.push(user.email)
    }

    if (emails.length > 0) {
      const subject = `${drinkerName} trinkt gerade ${drinkName ?? 'einen Whisky'} 🥃`
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #1c1917; color: #e7e5e4; padding: 32px; border-radius: 16px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0 0 8px;">Cask Lounge</h1>
          <h2 style="font-size: 20px; margin: 0 0 16px;">${subject}</h2>
          ${record.message ? `<blockquote style="border-left: 3px solid #f59e0b; margin: 16px 0; padding-left: 16px; color: #d6d3d1;">"${record.message}"</blockquote>` : ''}
          <p style="color: #57534e; font-size: 12px; margin-top: 32px;">Cask Lounge · casklounge.com</p>
        </div>
      `
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Cask Lounge <noreply@casklounge.com>',
          to: emails,
          reply_to: 'info@casklounge.com',
          subject,
          html,
        }),
      })
      const resendData = await resendRes.json()
      console.log('Resend response:', resendData)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err), { status: 500 })
  }
})
