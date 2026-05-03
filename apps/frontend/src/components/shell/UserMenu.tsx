/**
 * Minimal placeholder user menu.
 *
 * The 52L original showed a Google profile picture pulled from a CF Access
 * JWT. The OSS build doesn't ship auth — operators add their own (oauth2-proxy,
 * Caddy basic auth, Tailscale serve, etc.) — so this is a static badge.
 * Replace with whatever your auth proxy exposes (e.g. read an `X-Auth-User`
 * header injected upstream).
 */
export function UserMenu() {
  return (
    <button
      type="button"
      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
      aria-label="User menu"
      onClick={() => {
        // No-op. Hook up to your auth proxy / sign-out route here.
      }}
    >
      Account
    </button>
  );
}
