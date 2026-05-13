const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

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
  const event = req.headers.get('x-gitlab-event');
  const body = await req.json();
  let message = '';

  // ── PUSH ──────────────────────────────────────
  if (event === 'Push Hook') {
    const branch = body.ref.replace('refs/heads/', '');
    const commits = body.commits?.length || 0;
    message =
      `📤 <b>New Push</b>\n` +
      `👤 ${body.user_name}\n` +
      `🌿 Branch: <code>${branch}</code>\n` +
      `📦 ${commits} commit(s)\n` +
      `📁 ${body.project.name}`;
  }

  // ── MERGE REQUEST ─────────────────────────────
  else if (event === 'Merge Request Hook') {
    const mr = body.object_attributes;
    const action = mr.action;
    const emoji =
      action === 'merged' ? '✅' :
      action === 'opened' ? '🔀' :
      action === 'closed' ? '❌' : '📝';
    message =
      `${emoji} <b>Merge Request ${action.toUpperCase()}</b>\n` +
      `👤 ${body.user.name}\n` +
      `📌 <a href="${mr.url}">!${mr.iid} ${mr.title}</a>\n` +
      `🌿 ${mr.source_branch} → ${mr.target_branch}\n` +
      `📁 ${body.project.name}`;
  }

  // ── PIPELINE ──────────────────────────────────
  else if (event === 'Pipeline Hook') {
    const pipe = body.object_attributes;
    const emoji =
      pipe.status === 'success' ? '✅' :
      pipe.status === 'failed'  ? '❌' : '🔄';
    message =
      `${emoji} <b>Pipeline ${pipe.status.toUpperCase()}</b>\n` +
      `👤 ${body.user.name}\n` +
      `🌿 Branch: <code>${pipe.ref}</code>\n` +
      `⏱ Duration: ${pipe.duration}s\n` +
      `📁 ${body.project.name}`;
  }

  // ── TAG ───────────────────────────────────────
  else if (event === 'Tag Push Hook') {
    const tag = body.ref.replace('refs/tags/', '');
    message =
      `🏷️ <b>New Tag Created</b>\n` +
      `👤 ${body.user_name}\n` +
      `🔖 Tag: <code>${tag}</code>\n` +
      `📁 ${body.project.name}`;
  }

  if (message) await sendTelegram(message);
  return Response.json({ ok: true });
}