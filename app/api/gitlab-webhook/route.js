const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

function upper(str) {
  if (!str) return '';
  return str.toUpperCase();
}

async function sendTelegram(message) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
}

export async function POST(req) {
  try {
    const event = req.headers.get('x-gitlab-event');
    const body = await req.json();
    let message = '';

    // ── PUSH ──────────────────────────────────────
    if (event === 'Push Hook') {
      const branch = body.ref?.replace('refs/heads/', '') || 'unknown';
      const commits = body.commits?.length || 0;
      const userName = body.user_name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';
      message =
        `📤 <b>New Push</b>\n` +
        `👤 ${userName}\n` +
        `🌿 Branch: <code>${branch}</code>\n` +
        `📦 ${commits} commit(s)\n` +
        `📁 ${projectName}`;
    }

    // ── MERGE REQUEST ─────────────────────────────
    else if (event === 'Merge Request Hook') {
      const mr = body.object_attributes || {};
      const action = mr.action || 'updated';
      const emoji =
        action === 'merged' ? '✅' :
        action === 'opened' ? '🔀' :
        action === 'closed' ? '❌' : '📝';
      const userName = body.user?.name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';
      message =
        `${emoji} <b>Merge Request ${upper(action)}</b>\n` +
        `👤 ${userName}\n` +
        `📌 <a href="${mr.url || '#'}">!${mr.iid || '?'} ${mr.title || 'No title'}</a>\n` +
        `🌿 ${mr.source_branch || '?'} → ${mr.target_branch || '?'}\n` +
        `📁 ${projectName}`;
    }

    // ── PIPELINE ──────────────────────────────────
    else if (event === 'Pipeline Hook') {
      const pipe = body.object_attributes || {};
      const status = pipe.status || 'unknown';
      const emoji =
        status === 'success' ? '✅' :
        status === 'failed'  ? '❌' : '🔄';
      const userName = body.user?.name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';
      message =
        `${emoji} <b>Pipeline ${upper(status)}</b>\n` +
        `👤 ${userName}\n` +
        `🌿 Branch: <code>${pipe.ref || 'unknown'}</code>\n` +
        `⏱ Duration: ${pipe.duration || 0}s\n` +
        `📁 ${projectName}`;
    }

    // ── TAG ───────────────────────────────────────
    else if (event === 'Tag Push Hook') {
      const tag = body.ref?.replace('refs/tags/', '') || 'unknown';
      const userName = body.user_name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';
      message =
        `🏷️ <b>New Tag Created</b>\n` +
        `👤 ${userName}\n` +
        `🔖 Tag: <code>${tag}</code>\n` +
        `📁 ${projectName}`;
    }

    if (message) await sendTelegram(message);
    return Response.json({ ok: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return Response.json({ ok: false, error: err.message }, { status: 200 });
  }
}