const DEFAULT_NOIBO_URL = "https://noibo.edutalk.edu.vn/";
const DEFAULT_CLIENT_ID = "tochuc-giaovien";
const CALLBACK_PATH = "/dang-nhap/callback";

export function getNoiboUrl(): string {
  const url = import.meta.env.VITE_NOIBO_URL || DEFAULT_NOIBO_URL;
  return url.endsWith("/") ? url : `${url}/`;
}

export function getNoiboOrigin(): string {
  return getNoiboUrl().replace(/\/$/, "");
}

export function getOAuthClientId(): string {
  return import.meta.env.VITE_OAUTH_CLIENT_ID || DEFAULT_CLIENT_ID;
}

export function getOAuthRedirectUri(): string {
  const raw = import.meta.env.VITE_OAUTH_REDIRECT_URI
    ? import.meta.env.VITE_OAUTH_REDIRECT_URI
    : `${window.location.origin}${CALLBACK_PATH}`;
  return raw.trim().replace(/\/$/, "");
}

export function createOAuthState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function saveOAuthState(state: string): void {
  sessionStorage.setItem("tcgv_oauth_state", state);
}

export function consumeOAuthState(state: string | null): boolean {
  if (!state) return false;
  const saved = sessionStorage.getItem("tcgv_oauth_state");
  sessionStorage.removeItem("tcgv_oauth_state");
  return saved === state;
}

const OAUTH_CODE_KEY_PREFIX = "tcgv_oauth_code_used:";

export function isOAuthCodeUsed(code: string): boolean {
  return sessionStorage.getItem(`${OAUTH_CODE_KEY_PREFIX}${code}`) === "1";
}

export function markOAuthCodeUsed(code: string): void {
  sessionStorage.setItem(`${OAUTH_CODE_KEY_PREFIX}${code}`, "1");
}

/** Xóa ?code=&state= khỏi URL để F5 không gọi lại API đổi code. */
export function clearOAuthCallbackQuery(): void {
  window.history.replaceState({}, "", CALLBACK_PATH);
}

export function buildEdutalkAuthorizeUrl(): string {
  const state = createOAuthState();
  saveOAuthState(state);

  const params = new URLSearchParams({
    client_id: getOAuthClientId(),
    redirect_uri: getOAuthRedirectUri(),
    response_type: "code",
    state
  });

  return `${getNoiboOrigin()}/adn-authorize?${params.toString()}`;
}

export function startEdutalkLogin(): void {
  window.location.href = buildEdutalkAuthorizeUrl();
}

export const OAUTH_CALLBACK_PATH = CALLBACK_PATH;
