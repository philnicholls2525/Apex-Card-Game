import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const fail = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), { status, headers: cors });
const key = () => crypto.randomUUID();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");
  const authorization = req.headers.get("Authorization");
  if (!authorization) return fail(401, "missing_auth", "Sign in to play.");
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return fail(401, "invalid_auth", "Your session has expired.");
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail(400, "bad_json", "Invalid request body."); }
  const action = String(body.action || "");
  const idempotencyKey = String(body.idempotencyKey || key());
  const userId = userData.user.id;
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await admin.rpc(name, args);
    if (error) throw error;
    return data;
  };
  try {
    let data: unknown;
    switch (action) {
      case "bootstrap": data = await rpc("api_bootstrap", { p_user: userId }); break;
      case "onboard": data = await rpc("api_onboard", { p_user: userId, p_display: String(body.displayName || ""), p_username: String(body.username || ""), p_key: idempotencyKey }); break;
      case "import.localSave": data = await rpc("api_import_local_save", { p_user: userId, p_save: body.save || {}, p_key: idempotencyKey }); break;
      case "purchase": data = await rpc("api_purchase", { p_user: userId, p_product_key: String(body.productKey), p_key: idempotencyKey }); break;
      case "open.start": data = await rpc("api_open_start", { p_user: userId, p_product_key: String(body.productKey), p_quantity: Number(body.quantity || 1), p_key: idempotencyKey }); break;
      case "open.reveal": data = await rpc("api_open_reveal", { p_user: userId, p_opening: String(body.openingId), p_key: idempotencyKey }); break;
      case "gallery": data = await rpc("api_toggle_gallery", { p_user: userId, p_card_code: String(body.cardCode), p_enabled: Boolean(body.enabled), p_key: idempotencyKey }); break;
      case "quickSell": data = await rpc("api_quick_sell", { p_user: userId, p_cards: body.cards || {}, p_key: idempotencyKey }); break;
      case "draft.start": case "draft.action": case "rush.start": case "rush.action": case "sbc.submit": case "objective.claim":
        return fail(501, "mode_pending", "This server action is reserved but is not enabled in this checkpoint.");
      default: return fail(400, "unknown_action", "Unknown game action.");
    }
    return new Response(JSON.stringify({ data }), { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Game action failed.";
    console.error(action, message);
    return fail(message.includes("Insufficient") ? 409 : 400, "game_action_failed", message);
  }
});
