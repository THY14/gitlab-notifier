const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const THREADS = {
  push:     process.env.THREAD_PUSH,
  mr:       process.env.THREAD_MR,
  pipeline: process.env.THREAD_PIPELINE,
  tag:      process.env.THREAD_TAG,
};

function upper(str) {
  if (!str) return '';
  return str.toUpperCase();
}

async function sendTelegram(message, threadId) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_thread_id: threadId,
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
    let threadId = null;

    // ── PUSH ──────────────────────────────────────
    if (event === 'Push Hook') {
      const branch = body.ref?.replace('refs/heads/', '') || 'unknown';
      const commits = body.commits?.length || 0;
      const userName = body.user_name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';
      const projectUrl = body.project?.web_url || '#';
      const compareUrl = body.compare?.url || projectUrl;

      threadId = THREADS.push;
      message =
        `<b>${userName}</b> pushed to branch ` +
        `<a href="${projectUrl}/tree/${branch}">${branch}</a> ` +
        `of ${projectName}\n` +
        `📦 ${commits} commit(s) — ` +
        `<a href="${compareUrl}">Compare changes</a>`;
    }

    // ── MERGE REQUEST ─────────────────────────────
    else if (event === 'Merge Request Hook') {
      const mr = body.object_attributes || {};
      const action = mr.action || 'updated';
      const userName = body.user?.name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';

      threadId = THREADS.mr;
      message =
        `<b>${userName}</b> ${action} merge request ` +
        `<a href="${mr.url || '#'}">!${mr.iid || '?'} ${mr.title || ''}</a> ` +
        `in ${projectName}\n` +
        `🌿 ${mr.source_branch || '?'} → ${mr.target_branch || '?'}`;
    }

    // ── PIPELINE ──────────────────────────────────
    else if (event === 'Pipeline Hook') {
      const pipe = body.object_attributes || {};
      const status = pipe.status || 'unknown';
      const userName = body.user?.name || 'Someone';
      const projectName = body.project?.name || 'Unknown';
      const projectUrl = body.project?.web_url || '#';
      const pipeId = pipe.id || '?';
      const branch = pipe.ref || 'unknown';
      const duration = pipe.duration
        ? `${Math.floor(pipe.duration / 60).toString().padStart(2, '0')}:${(pipe.duration % 60).toString().padStart(2, '0')}`
        : '00:00';
      const passed =
        status === 'success' ? 'has passed' :
        status === 'failed'  ? 'has failed' : status;

      threadId = THREADS.pipeline;
      message =
        `<a href="${projectUrl}">${projectName}</a>: ` +
        `Pipeline <a href="${projectUrl}/-/pipelines/${pipeId}">#${pipeId}</a> ` +
        `of branch <b>${branch}</b> ` +
        `by ${userName} ${passed} in ${duration}`;
    }

    // ── TAG ───────────────────────────────────────
    else if (event === 'Tag Push Hook') {
      const tag = body.ref?.replace('refs/tags/', '') || 'unknown';
      const userName = body.user_name || 'Someone';
      const projectName = body.project?.name || 'Unknown Project';
      const projectUrl = body.project?.web_url || '#';

      threadId = THREADS.tag;
      message =
        `<b>${userName}</b> created tag ` +
        `<a href="${projectUrl}/-/tags/${tag}">${tag}</a> ` +
        `in ${projectName}`;
    }

    if (message) await sendTelegram(message, threadId);
    return Response.json({ ok: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return Response.json({ ok: false, error: err.message }, { status: 200 });
  }
}