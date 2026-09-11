# Email signature

Company-only LEVO signature for Gmail, Outlook, and Apple Mail. Open [`email-signature.html`](email-signature.html) in a browser, then **Copy signature**.

The block uses the company name, slogan, and info email from Site settings (`LEVO Lighting`, `LIGHT EVOLUTION`, `info@levo-lighting.com`) and the public domain `levolight.com`. Phone, address, and social links are omitted until those fields are real (the database still has seed placeholders). There is no personal name or job title.

The black **L** mark is HTML, not a remote image, so it still appears when the mail client blocks pictures.

## Paste into the mail app

### Gmail

1. Open [docs/email-signature.html](email-signature.html) and click **Copy signature**.
2. Gmail → Settings → See all settings → **General** → **Signature**.
3. Create a signature, paste, and save. Use this signature on new emails (and replies if you want).

### Outlook (Windows)

1. Copy the signature from the HTML page.
2. File → Options → Mail → **Signatures**.
3. New signature, paste, save, and set it as the default for new messages.

If paste looks plain, use **Copy HTML** and Outlook’s **Insert** → **Attach File** is the wrong path — paste into the signature editor with Ctrl+V after copying the rich preview.

### Outlook on the web / Apple Mail

Paste the copied preview into the signature box (Outlook: Settings → Compose and reply; Apple Mail: Settings → Signatures). Keep **Always match my default font** off in Outlook if it restyles the block.

## Update later

When `/admin/settings` has a real phone, address, or website, say so in chat and refresh this HTML. Do not point the website link at a LAN IP. After DNS and TLS, change the `levolight.com` href from `http` to `https`.
