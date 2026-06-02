/**
 * gramJS client wrapper — runs entirely in the browser/WebView.
 * No backend server required.
 */
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import bigInt from "big-integer";

// Persisted in localStorage so the user stays logged in across app restarts
const SESSION_KEY = "tg_session";
const API_ID_KEY  = "tg_api_id";
const API_HASH_KEY = "tg_api_hash";

// These are the app's own API credentials from my.telegram.org
// Users log in with their phone — these are NOT user credentials.
const DEFAULT_API_ID   = Number(import.meta.env.VITE_API_ID   ?? 0);
const DEFAULT_API_HASH = String(import.meta.env.VITE_API_HASH ?? "");

let _client: TelegramClient | null = null;

function getStoredSession(): string {
  return localStorage.getItem(SESSION_KEY) ?? "";
}

function saveSession(s: string) {
  localStorage.setItem(SESSION_KEY, s);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId   = Number(localStorage.getItem(API_ID_KEY))   || DEFAULT_API_ID;
  const apiHash = localStorage.getItem(API_HASH_KEY)          || DEFAULT_API_HASH;
  return { apiId, apiHash };
}

export function saveApiCredentials(apiId: number, apiHash: string) {
  localStorage.setItem(API_ID_KEY,   String(apiId));
  localStorage.setItem(API_HASH_KEY, apiHash);
}

export async function getClient(): Promise<TelegramClient> {
  if (_client?.connected) return _client;

  const { apiId, apiHash } = getApiCredentials();
  if (!apiId || !apiHash) throw new Error("API credentials not set");

  const session = new StringSession(getStoredSession());
  _client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await _client.connect();
  return _client;
}

export async function isAuthorized(): Promise<boolean> {
  try {
    const client = await getClient();
    return await client.isUserAuthorized();
  } catch {
    return false;
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const PHONE_KEY      = "tg_phone";
const PHONE_HASH_KEY = "tg_phone_hash";

function saveLoginState(phone: string, phoneCodeHash: string) {
  sessionStorage.setItem(PHONE_KEY,      phone);
  sessionStorage.setItem(PHONE_HASH_KEY, phoneCodeHash);
}

function loadLoginState(): { phone: string; phoneCodeHash: string } {
  return {
    phone:         sessionStorage.getItem(PHONE_KEY)      ?? "",
    phoneCodeHash: sessionStorage.getItem(PHONE_HASH_KEY) ?? "",
  };
}

function clearLoginState() {
  sessionStorage.removeItem(PHONE_KEY);
  sessionStorage.removeItem(PHONE_HASH_KEY);
}

export async function sendCode(phone: string): Promise<void> {
  const client = await getClient();
  const result = await client.sendCode(
    { apiId: getApiCredentials().apiId, apiHash: getApiCredentials().apiHash },
    phone
  );
  saveLoginState(phone, result.phoneCodeHash);
}

export async function signIn(code: string): Promise<"ok" | "2fa"> {
  const client = await getClient();
  const { phone, phoneCodeHash } = loadLoginState();
  if (!phone || !phoneCodeHash) throw new Error("Login session expired — please re-enter your phone number.");
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );
    saveSession(client.session.save() as unknown as string);
    clearLoginState();
    return "ok";
  } catch (e: any) {
    if (e.errorMessage === "SESSION_PASSWORD_NEEDED") return "2fa";
    throw e;
  }
}

export async function signIn2FA(password: string): Promise<void> {
  const client = await getClient();
  const pwdInfo = await client.invoke(new Api.account.GetPassword());
  const { computeCheck } = await import("telegram/Password");
  const check = await computeCheck(pwdInfo, password);
  await client.invoke(new Api.auth.CheckPassword({ password: check }));
  saveSession(client.session.save() as unknown as string);
  clearLoginState();
}

export async function signOut(): Promise<void> {
  try {
    const client = await getClient();
    await client.invoke(new Api.auth.LogOut());
    await client.disconnect();
  } catch { /* ignore */ }
  _client = null;
  _me = null;
  clearSession();
  clearLoginState();
  clearDialogCache();
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

export interface Dialog {
  id: number;
  name: string;
  type: "channel" | "group" | "bot";
  unreadCount: number;
  entity: any;
}

// In-memory cache — cleared on sign out
let _dialogCache: Dialog[] | null = null;

export function clearDialogCache() {
  _dialogCache = null;
}

function classifyEntity(entity: any): "channel" | "group" | "bot" | null {
  if (!entity) return null;
  const t = entity.className;
  if (t === "Channel") return entity.megagroup ? "group" : "channel";
  if (t === "Chat")    return "group";
  if (t === "User")    return entity.bot ? "bot" : null;
  return null;
}

const BATCH_SIZE = 100;
const MAX_DIALOGS = 500;

/**
 * Streams dialogs in batches of BATCH_SIZE.
 * Calls onBatch after each batch so the UI can render incrementally.
 * Returns the full list when done.
 */
export async function getDialogs(
  onBatch?: (dialogs: Dialog[]) => void,
  forceRefresh = false
): Promise<Dialog[]> {
  if (_dialogCache && !forceRefresh) {
    onBatch?.(_dialogCache);
    return _dialogCache;
  }

  const client = await getClient();
  const result: Dialog[] = [];
  let offsetDate = 0;
  let offsetId = 0;
  let offsetPeer: any = new Api.InputPeerEmpty();

  while (result.length < MAX_DIALOGS) {
    const batch = await client.invoke(
      new Api.messages.GetDialogs({
        offsetDate,
        offsetId,
        offsetPeer,
        limit:       BATCH_SIZE,
        hash:        bigInt(0),
        excludePinned: false,
        folderId:    undefined,
      })
    ) as any;

    const dialogs = batch.dialogs ?? [];
    if (dialogs.length === 0) break;

    // Build entity map from the response
    const entityMap: Record<string, any> = {};
    for (const u of batch.users  ?? []) entityMap[`user_${u.id}`]    = u;
    for (const c of batch.chats  ?? []) entityMap[`chat_${c.id}`]    = c;

    const newItems: Dialog[] = [];
    for (const d of dialogs) {
      const peer = d.peer;
      let entity: any = null;
      if (peer?.className === "PeerChannel") entity = entityMap[`chat_${peer.channelId}`];
      else if (peer?.className === "PeerChat") entity = entityMap[`chat_${peer.chatId}`];
      else if (peer?.className === "PeerUser") entity = entityMap[`user_${peer.userId}`];

      const type = classifyEntity(entity);
      if (!type) continue;
      newItems.push({
        id:          Number(peer?.channelId ?? peer?.chatId ?? peer?.userId ?? 0),
        name:        entity?.title ?? [entity?.firstName, entity?.lastName].filter(Boolean).join(" ") ?? entity?.username ?? "Unknown",
        type,
        unreadCount: d.unreadCount ?? 0,
        entity,
      });
    }

    result.push(...newItems);

    // Deduplicate by ID — keep first occurrence, remove any later duplicates
    // (Telegram pagination sometimes returns the boundary item twice)
    const seen = new Set<number>();
    for (let i = 0; i < result.length; i++) {
      if (seen.has(result[i].id)) {
        result.splice(i, 1);
        i--;
      } else {
        seen.add(result[i].id);
      }
    }

    onBatch?.([...result]);

    // Prepare offset for next page
    const lastDialog = dialogs[dialogs.length - 1];
    const lastMsg    = (batch.messages ?? []).find((m: any) => m.id === lastDialog.topMessage);
    if (!lastMsg) break;
    offsetDate = lastMsg.date;
    offsetId   = lastMsg.id;
    // Resolve offsetPeer to a proper InputPeer for the next page
    try {
      const lastPeerEntity = entityMap[
        lastDialog.peer?.className === "PeerChannel" ? `chat_${lastDialog.peer.channelId}` :
        lastDialog.peer?.className === "PeerChat"    ? `chat_${lastDialog.peer.chatId}`    :
        `user_${lastDialog.peer?.userId}`
      ];
      offsetPeer = lastPeerEntity
        ? await client.getInputEntity(lastPeerEntity)
        : lastDialog.peer;
    } catch {
      offsetPeer = lastDialog.peer;
    }

    if (dialogs.length < BATCH_SIZE) break; // last page
  }

  _dialogCache = result;
  return result;
}

export interface LeaveEvent {
  id: number;
  name: string;
  status: "success" | "failed";
  reason?: string;
  done: number;
  failed: number;
  total: number;
}

export type LeaveSpeed = "safe" | "fast" | "turbo";

const SPEED_DELAY: Record<LeaveSpeed, [number, number]> = {
  safe:  [800,  1500], // 0.8–1.5s  — very safe
  fast:  [300,  700],  // 0.3–0.7s  — 3x faster, still fine
  turbo: [100,  300],  // 0.1–0.3s  — max speed, FLOOD_WAIT may kick in
};

// Cache getMe() so group leaves don't make an extra API call every time
let _me: any = null;
async function getMe(): Promise<any> {
  if (_me) return _me;
  const client = await getClient();
  _me = await client.getMe();
  return _me;
}

async function deleteDialog(entity: any, blockBots = true): Promise<void> {
  const client = await getClient();
  const className = entity?.className;

  // Resolve to a proper InputPeer/InputChannel with accessHash
  // Without this, Telegram silently ignores or rejects the call
  const inputEntity = await client.getInputEntity(entity);

  if (className === "Channel") {
    await client.invoke(new Api.channels.LeaveChannel({ channel: inputEntity }));

  } else if (className === "Chat") {
    if (entity.creator) {
      throw new Error("You own this group — transfer ownership or delete it first.");
    }
    await client.invoke(new Api.messages.DeleteChatUser({
      chatId: entity.id,
      userId: new Api.InputUserSelf(),
      revokeHistory: false,
    }));

  } else {
    // Bot or user — delete the conversation
    await client.invoke(new Api.messages.DeleteHistory({
      peer: inputEntity,
      maxId: 0,
      justClear: false,
      revoke: false,
    }));
    // Block the bot so it can't message you again
    if (blockBots && entity?.bot) {
      try {
        await client.invoke(new Api.contacts.Block({ id: inputEntity }));
      } catch { /* non-fatal — dialog is already removed */ }
    }
  }
}

export async function* leaveDialogs(
  dialogs: Dialog[],
  speed: LeaveSpeed = "fast"
): AsyncGenerator<LeaveEvent> {
  const total = dialogs.length;
  let done = 0;
  let failed = 0;
  const [minDelay, maxDelay] = SPEED_DELAY[speed];

  for (const d of dialogs) {
    try {
      await deleteDialog(d.entity);
      done++;
      yield { id: d.id, name: d.name, status: "success", done, failed, total };
    } catch (e: any) {
      if (e.errorMessage?.startsWith("FLOOD_WAIT_")) {
        // Telegram told us exactly how long to wait — respect it
        const wait = (parseInt(e.errorMessage.split("_").pop()) + 2) * 1000;
        yield { id: d.id, name: d.name, status: "failed", reason: `Flood wait ${Math.round(wait/1000)}s — retrying…`, done, failed, total };
        await sleep(wait);
        try {
          await deleteDialog(d.entity);
          done++;
          yield { id: d.id, name: d.name, status: "success", done, failed, total };
          await sleep(randomDelay(minDelay, maxDelay));
          continue;
        } catch (e2: any) {
          failed++;
          yield { id: d.id, name: d.name, status: "failed", reason: String(e2.message), done, failed, total };
          continue;
        }
      }
      failed++;
      yield { id: d.id, name: d.name, status: "failed", reason: String(e.message), done, failed, total };
    }
    await sleep(randomDelay(minDelay, maxDelay));
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay(min: number, max: number) { return min + Math.random() * (max - min); }
