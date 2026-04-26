# DNS setup for vima

After registering the two domains, set these records at the registrar's DNS panel.

## Server target

All records point to the vultr box: **`45.76.77.107`**

## Records to add

### `vimaspatial.tech` (primary brand)

| Type | Name (host) | Value          | TTL  | Notes                         |
|------|-------------|----------------|------|-------------------------------|
| A    | `@`         | `45.76.77.107` | 300  | apex domain                   |
| A    | `www`       | `45.76.77.107` | 300  | redirected to apex by caddy   |

### `thisisthebestdottechdomainnameathack.tech` (meme)

| Type | Name (host) | Value          | TTL  | Notes                                       |
|------|-------------|----------------|------|---------------------------------------------|
| A    | `@`         | `45.76.77.107` | 300  | caddy 301-redirects to vimaspatial.tech     |

## Cloudflare gotcha

If you use Cloudflare for DNS, **set the cloud icon to grey (DNS-only)**, not orange (proxied). Reasons:
1. Caddy needs to do its own letsencrypt challenge — Cloudflare's proxy interferes with HTTP-01.
2. Cloudflare's edge cert + Caddy's edge cert can fight.

You can re-enable the orange cloud later after switching Caddy to use Cloudflare DNS-01 ACME challenge — but for the demo, keep it simple: grey cloud.

## Verifying DNS propagated

```bash
dig +short vimaspatial.tech
dig +short www.vimaspatial.tech
dig +short thisisthebestdottechdomainnameathack.tech
```

All three should return `45.76.77.107`. Usually propagates in 1–30 minutes; sometimes up to 24h.

## What happens once DNS resolves

Caddy is already configured and running. The moment it sees a request for one of those domains:
1. Asks letsencrypt for a cert via HTTP-01 challenge on port 80.
2. Letsencrypt verifies by hitting `http://<domain>/.well-known/acme-challenge/...` — caddy serves it.
3. Cert issued (~10-30s). Caddy installs and serves over HTTPS.
4. Auto-renews 30 days before expiry, forever.

No manual steps. Just verify with:

```bash
curl -vI https://vimaspatial.tech 2>&1 | grep -E "HTTP|subject|issuer"
```

Should show `HTTP/2 200`, valid Let's Encrypt cert.

## If caddy gets stuck

```bash
ssh root@45.76.77.107
docker logs infra-caddy-1 --tail 50
```

Common issues:
- DNS hasn't propagated yet → wait, retry
- Port 80 blocked → check vultr firewall (it's open in our group `1cf3879c-...`)
- Cloudflare proxy on → flip to grey cloud
- Letsencrypt rate-limited (>5 failures/hour) → switch to staging temporarily (see Caddyfile comment)
