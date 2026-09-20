// ================================================================
//  KFAHAD Academy — Messages Function (hardened)
//  Group chat + DMs. Requires a valid session.
// ================================================================
const S = require("./_security");

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isHumanChatMessage(message = {}) {
  return (message.sender_id || message.senderId) !== "ai-bot";
}

function normalizeMessage(message = {}) {
  const readBy = Array.isArray(message.read_by)
    ? [...new Set(message.read_by.filter(Boolean))]
    : [];
  const deliveredTo = Array.isArray(message.delivered_to)
    ? [...new Set(message.delivered_to.filter(Boolean))]
    : [];
  const senderId = message.sender_id || message.senderId;
  const receiverId = message.receiver_id || message.receiverId;
  if (senderId && !readBy.includes(senderId)) readBy.push(senderId);
  if (receiverId && !deliveredTo.includes(receiverId)) deliveredTo.push(receiverId);
  return {
    id: message.id,
    senderId: senderId,
    text: typeof message.text === "string" ? message.text : "",
    createdAt: Number(message.created_at) || Number(message.createdAt) || Date.now(),
    channel: message.channel || (receiverId ? "dm" : "group"),
    receiverId: receiverId || null,
    read: Boolean(message.read),
    readBy: readBy,
    deliveredTo: deliveredTo,
  };
}

async function getMessagesFromSupabase() {
  const sb = S.getSupabase();
  const { data, error } = await sb
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).filter(isHumanChatMessage);
}

async function saveMessageToSupabase(message) {
  const sb = S.getSupabase();
  const { data, error } = await sb
    .from("messages")
    .upsert(
      {
        id: message.id,
        sender_id: message.senderId,
        text: message.text,
        created_at: message.createdAt || Date.now(),
        channel: message.channel || (message.receiverId ? "dm" : "group"),
        receiver_id: message.receiverId || null,
        read: message.read || false,
        read_by: message.readBy || [],
        delivered_to: message.deliveredTo || [],
      },
      { onConflict: "id" }
    )
    .select();
  if (error) throw error;
  return data;
}

async function updateMessageReadStatus(messageId, viewerId) {
  const sb = S.getSupabase();
  const { data: msg } = await sb
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (!msg) return;
  let readBy = msg.read_by || [];
  if (!readBy.includes(viewerId)) readBy.push(viewerId);
  await sb.from("messages").update({ read_by: readBy, read: true }).eq("id", messageId);
}

exports.handler = async (event) => {
  const pre = S.preflight(event);
  if (pre) return pre;

  // Firewall check
  const fw = S.firewallCheck(event);
  if (fw.blocked) {
    return S.respond(event, 403, { error: "Access denied." });
  }

  if (!S.supabaseConfigured()) {
    return S.fail(event, 503, "Chat is temporarily unavailable.");
  }

  // Every chat action requires a valid session.
  const session = await S.getSession(event);
  if (!session) return S.fail(event, 401, "Please sign in to use chat.");

  try {
    if (event.httpMethod === "GET") {
      const limited = S.enforceRateLimit(event, "msg_read", 60, 30000);
      if (limited) return limited;
      const messages = await getMessagesFromSupabase();
      return S.respond(event, 200, { messages: messages.map(normalizeMessage) });
    }

    if (event.httpMethod !== "POST") {
      return S.fail(event, 405, "Method not allowed.");
    }

    const { data: body, error } = S.readJson(event);
    if (error) return S.fail(event, 400, "Invalid request.");
    const action = S.sanitizeString(body.action, 20);

    if (action === "send") {
      const limited = S.enforceRateLimit(event, "msg_send", 30, 30000);
      if (limited) return limited;

      const incoming = body.message || {};
      // Sender is ALWAYS taken from the session, never trusted from the client.
      const message = normalizeMessage({
        ...incoming,
        senderId: session.user_id,
        text: S.sanitizeString(incoming.text, 4000),
      });
      if (message.id && message.text.trim() && isHumanChatMessage(message)) {
        await saveMessageToSupabase(message);
      }
      const messages = await getMessagesFromSupabase();
      return S.respond(event, 200, { messages: messages.map(normalizeMessage) });
    }

    if (action === "read") {
      const limited = S.enforceRateLimit(event, "msg_read_state", 60, 30000);
      if (limited) return limited;

      const viewerId = session.user_id; // from session, not the client
      const channel = S.sanitizeString(body.channel, 20);
      const userId = body.userId ? S.sanitizeString(body.userId, 100) : null;
      if (!channel) return S.fail(event, 400, "Channel is required.");

      const messages = await getMessagesFromSupabase();
      for (const message of messages) {
        const normalized = normalizeMessage(message);
        const shouldMarkGroup =
          channel === "group" &&
          normalized.channel === "group" &&
          normalized.senderId !== viewerId;
        const shouldMarkDm =
          channel === "dm" &&
          normalized.channel === "dm" &&
          normalized.senderId === userId &&
          normalized.receiverId === viewerId;
        if (shouldMarkGroup || shouldMarkDm) {
          await updateMessageReadStatus(normalized.id, viewerId);
        }
      }
      const updated = await getMessagesFromSupabase();
      return S.respond(event, 200, { messages: updated.map(normalizeMessage) });
    }

    if (action === "health") {
      return S.respond(event, 200, { ok: true, provider: "supabase", timestamp: Date.now() });
    }

    return S.fail(event, 400, "Unknown action.");
  } catch (error) {
    return S.fail(event, 500, "Chat service error. Please try again.", error);
  }
};
