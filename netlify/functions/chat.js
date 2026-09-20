// ================================================================
//  KFAHAD Academy — AI Chat Function (hardened)
// ================================================================
const { GoogleGenerativeAI } = require("@google/generative-ai");
const S = require("./_security");

const DEFAULT_SYSTEM_PROMPT =
  "You are the KFAHAD Academy AI Tutor. Help students with Psychology and Web Development. You are friendly, patient, and encouraging. Provide helpful answers about HTML, CSS, JavaScript, Psychology, Web Development, and other courses offered at KFAHAD Academy.";

exports.handler = async (event) => {
  const pre = S.preflight(event);
  if (pre) return pre;

  // Firewall check
  const fw = S.firewallCheck(event);
  if (fw.blocked) {
    return S.respond(event, 403, { error: "Access denied." });
  }

  if (event.httpMethod !== "POST") {
    return S.fail(event, 405, "Method not allowed.");
  }

  // Rate limit to protect the API budget from abuse.
  const limited = S.enforceRateLimit(event, "ai_chat", 15, 60000);
  if (limited) return limited;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return S.respond(event, 200, {
      content: [
        { type: "text", text: "The AI tutor is not configured yet. Please try again later." },
      ],
    });
  }

  try {
    const { data: body, error } = S.readJson(event);
    if (error) return S.fail(event, 400, "Invalid request.");

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const systemPrompt = S.sanitizeString(body.system || DEFAULT_SYSTEM_PROMPT, 2000);
    const userMsg = S.sanitizeString(messages?.[messages.length - 1]?.content || "", 4000);

    if (!userMsg.trim()) {
      return S.respond(event, 200, {
        content: [
          { type: "text", text: "Hello! I'm your KFAHAD AI Tutor. How can I help you today?" },
        ],
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userMsg);
    const responseText =
      result.response?.text() ||
      "I'm having trouble generating a response. Please try again.";

    return S.respond(event, 200, { content: [{ type: "text", text: responseText }] });
  } catch (err) {
    console.error("AI Chat error:", err?.message, err?.stack);
    return S.respond(event, 200, {
      content: [
        { type: "text", text: "I'm temporarily unavailable. Please try again in a moment." },
      ],
    });
  }
};
