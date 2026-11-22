# Paradox Puppetry local website demo

## Run locally

Install Python 3.10 or later, then open a terminal in this folder and run:

```powershell
py admin_server.py
```

On Windows, you can instead double-click [START_PARADOX_PUPPETRY.bat](./START_PARADOX_PUPPETRY.bat). It starts the local server if needed, waits for it to respond, and opens the site in Chrome (or your default browser if Chrome is not installed in a standard location). Keep the server window open while using the site; closing it stops the local server.

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Use this HTTP address in Chrome instead of opening `index.html` directly from File Explorer. A `file://` preview can show the static homepage and shop, but visitor/admin sign-in and live community metrics require the local Python server. The **Account** link opens public visitor sign-in at `/account.html`. The header brand opens the separate Admin sign-in at [http://127.0.0.1:8000/admin/login.html](http://127.0.0.1:8000). Keep the server running for sign-in and dashboard features.

The public [Community & Growth page](http://127.0.0.1:8000/community.html) shows page visits served by this computer, active signed-in visitor sessions, and any available public social counts.

If the editor shows “Forbidden. File does not reside within a trusted folder,” it has opened a `file://` preview instead of the site. Open the HTTP sign-in URL above.

Local demo sign-in:

- Username: `Admin`
- Password: `2010`
- Owner username: `Owner`
- Owner demo password: `3004`

The separate local demo accounts are checked by the loopback-only Python server; passwords are not included in the browser login code. Admin access is limited to products, productions, episodes, characters, announcements, leaks, team and applications. The Owner Panel at `/admin/owner.html` has full dashboard access and an **Admin access** section to grant or revoke admin accounts. The default `Admin` / `2010` account is approved on first run; revoke it in the Owner Panel if you want only accounts you add to have access.

Admin usernames and salted password hashes are saved outside the website in `~/.paradox-puppetry-admins.json` and persist across local server restarts. Set `PP_ADMIN_ACCOUNTS_FILE` to choose another location. Set `PP_ADMIN_USER` and `PP_ADMIN_PASSWORD` before the first run to choose the initial approved admin; set `PP_OWNER_USER` and `PP_OWNER_PASSWORD` to configure the owner login. Granted passwords are never saved in browser storage or returned to the dashboard.

## Homepage background music

Use the **PLAY MUSIC** control in the lower-right corner to start the generated ambient soundtrack; select **MUTE MUSIC** to stop it. Playback starts only after a click, so there is no autoplay. The music is synthesized in the browser with the Web Audio API and does not require an audio file or external music service.

## Community & Growth metrics

The Community page is linked from the public navigation and can also be opened at `/community.html`. Local visit analytics are recorded only when the site is served by `admin_server.py`; they do not represent visitors to a deployed website. A random browser ID is hashed before it is stored for unique-visitor counts. The local SQLite database defaults to `~/.paradox-puppetry-community.sqlite3` and can be moved by setting `PP_COMMUNITY_STATS_FILE` before starting the server. Visitor hashes are retained for up to 90 days; page-view totals are aggregated by day.

Website members online counts distinct visitor email sessions currently signed in to this local server. It is not a total registration count, and guest visits are counted separately as anonymous visitors.

Social counts are optional and use public platform APIs. Set configuration in the PowerShell terminal that starts the local server, then restart it:

```powershell
$env:PP_YOUTUBE_API_KEY = "your-youtube-data-api-key"
# Optional; defaults to @ParadoxPuppetryOfficials
$env:PP_YOUTUBE_HANDLE = "@ParadoxPuppetryOfficials"
# Optional; defaults to the current Discord invite code
$env:PP_DISCORD_INVITE_CODE = "zvnVQHQ87"
# Set these only after creating and configuring an eligible Instagram professional account
$env:PP_INSTAGRAM_HANDLE = "your-instagram-handle"
$env:PP_INSTAGRAM_USER_ID = "your-instagram-user-id"
$env:PP_INSTAGRAM_ACCESS_TOKEN = "your-instagram-access-token"
$env:PP_INSTAGRAM_GRAPH_VERSION = "v22.0"
py admin_server.py
```

Keep API credentials in the server environment, never in website files or chat. Instagram is shown as not connected until the account and API access are configured. Discord counts are approximate and may be unavailable if Discord does not return public invite counts. Social readings are cached for five minutes; growth is compared with a saved snapshot at least six hours old, so it takes time to establish a baseline.

## Optional visitor Google sign-in

The homepage offers visitor sign-in after its intro; visitors can continue as guests, and the prompt stays dismissed for that browser tab. The public **Account** link remains available for signing in later. Any Google account with a verified email can create a customer session; this is separate from the password-only Admin and Owner panel. Create a Google OAuth client for a web application and add this authorized redirect URI:

```text
http://127.0.0.1:8000/auth/google/callback
```

Set the Google OAuth client credentials in the same PowerShell terminal used to start the server, then restart it:

```powershell
$env:PP_GOOGLE_CLIENT_ID = "your-client-id"
$env:PP_GOOGLE_CLIENT_SECRET = "your-client-secret"
py admin_server.py
```

Never put OAuth secrets in website files or share them in chat. Visitor sign-in does not grant admin access. The local demo stores customer sessions in server memory; profile, cart and wishlist data are not synced across devices. Cross-device sync requires a connected backend, which is not configured. Apple sign-in is visibly disabled in this local-only demo because Apple requires a registered domain for its redirect URL, not an IP address or `localhost` ([Apple setup requirements](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple)). Do not treat this local OAuth setup as production authentication.

## Important limitations

- This is a local development demo, not a production deployment. The server binds to `127.0.0.1` and exits if `PP_ENV=production`.
- Public, sign-in and dashboard layouts adapt for phone and tablet screens. On phones, shop, collection, announcement and studio cards use swipeable rails, and repeated promotional story panels are omitted; the studio story remains in the Studio section. Because this demo server intentionally listens only on `127.0.0.1`, a separate phone cannot connect to it; use browser device emulation for local checks or set up properly secured hosting before using another device.
- Admin and visitor sessions use separate server-memory sessions and HttpOnly, SameSite cookies. The demo password and these local-only sessions are not a substitute for production authentication.
- The public site has no visible Admin / Owner Portal button. Click the header brand to open the separate sign-in; choose Admin Access for the limited workspace or Owner Panel for full access.
- Only the owner account can grant or revoke admin logins. Revoking an account immediately ends its active local sessions. Share new credentials directly; the local demo does not email invitations.
- Role-based dashboard limits are for this local demo only. Website content and records are stored in browser local storage and are not protected from someone with access to that browser. Use server-side authorization and persistent storage before production.
- Shop content, applications, contact messages and dashboard records are stored in the browser's local storage. They are not securely protected, backed up, or shared with another device.
- Admins and the Owner can manage product availability and stock from **Products**. Choose **Out of stock** to hide add-to-bag controls while preserving the stock quantity, or set stock to `0` (an in-stock item must have a positive quantity). Open public shop tabs update when availability changes. Stock is demo data and is not decremented by orders because checkout is disabled.
- Contact and recruitment forms open the visitor's email app with a draft addressed to `paradoxpuppetrybusiness@gmail.com`. The visitor must review and send it; browser email apps and delivery are not controlled by this site. A local demo copy is saved in that browser.
- Orders are fictional examples. Checkout and payment processing are not connected, and payment details must not be entered.
- The Studio Leaks gallery is for studio-approved sneak peeks. Upload previews or mark them as drafts in the admin; drafts are not shown publicly.
- Studio Leaks and the recruitment open call are hidden from the public site by default. Admins and the Owner can show or hide Studio Leaks from **Studio leaks → Public website visibility**; the Owner can also control the creative open call from **Settings → Optional Sections**. Hiding a section does not delete its saved content.
- No Supabase or other backend is connected. Configure a real server-side authentication and data service before collecting real customer or applicant information.
