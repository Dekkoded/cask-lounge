import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Schickt eine E-Mail an info@casklounge.com, sobald neues Feedback
// (Idee oder Problem) in der Tabelle `feedback` eingeht.
// Angebunden über Database-Webhook (INSERT auf public.feedback).

const INBOX = 'info@casklounge.com'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record
    if (!record) return new Response('No record', { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Absender ermitteln (Profil + Login-E-Mail)
    let senderName = 'Ein Nutzer'
    let senderEmail = ''
    if (record.user_id) {
      const { data: profile } = await supabase
        .from('profiles').select('display_name, username').eq('id', record.user_id).single()
      senderName = profile?.display_name ?? profile?.username ?? senderName
      const { data: { user } } = await supabase.auth.admin.getUserById(record.user_id)
      senderEmail = user?.email ?? ''
    }

    const isProblem = record.type === 'problem'
    const icon = isProblem ? '🐞' : '💡'
    const label = isProblem ? 'Problem' : 'Idee'
    const subject = `${icon} Neues Feedback (${label}) von ${senderName}`
    const message = String(record.message ?? '')

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #1c1917; color: #e7e5e4; padding: 32px; border-radius: 16px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0 0 8px;">Cask Lounge</h1>
        <h2 style="font-size: 20px; margin: 0 0 16px;">${icon} Neues Feedback: ${label}</h2>
        <p style="font-size: 14px; color: #a8a29e; margin: 0 0 4px;">
          Von: <strong style="color: #e7e5e4;">${senderName}</strong>${senderEmail ? ` &lt;${senderEmail}&gt;` : ''}
        </p>
        <blockquote style="border-left: 3px solid #f59e0b; margin: 16px 0; padding-left: 16px; color: #d6d3d1; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</blockquote>
        <p style="color: #57534e; font-size: 12px; margin-top: 32px;">Cask Lounge · casklounge.com</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cask Lounge <noreply@casklounge.com>',
        to: [INBOX],
        // Direkt auf den Nutzer antworten können (falls Login-E-Mail vorhanden)
        ...(senderEmail ? { reply_to: senderEmail } : {}),
        subject,
        html,
      }),
    })
    const data = await res.json()
    console.log('Resend response:', data)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err), { status: 500 })
  }
})
