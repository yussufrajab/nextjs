# SSL Certificate Renewal — Setup, Failure & Resolution

**Domain:** `test.zanajira.go.tz`
**Server:** aaPanel on Proxmox VM (VMID 104, hostname `postgres-test`, LAN IP `10.0.225.15`)
**Public IP:** `102.207.206.28`
**Date resolved:** 2026-07-22
**Cert:** Let's Encrypt (issuer `YE1`), ECC, valid 2026-07-22 → 2026-10-20, auto-renews ~2026-09-19

---

## 1. TL;DR

The SSL renewal kept failing with:

```
Timeout during connect (likely firewall problem)
Fetching http://test.zanajira.go.tz/.well-known/acme-challenge/...: Timeout
```

**Root cause:** Let's Encrypt's default validation (HTTP-01) connects on **port 80**, but port 80 is **blocked at the upstream gateway** (`10.0.225.1`) — a device the server team does not control. The gateway only forwards `public:443 → 10.0.225.15:443`, not port 80. DNS validation (DNS-01) was also impossible because the domain's nameservers (`ns1/ns2.egaz.go.tz`, run by the Zanzibar eGA) could not be reached to add records.

**Solution:** Switched to Let's Encrypt's **TLS-ALPN-01** challenge, which validates over **port 443** (already open). Because nginx occupies 443, the renewal temporarily redirects inbound 443 → acme.sh on port 9443 via `iptables` while nginx keeps running. The whole flow is saved in `acme.sh` hooks and runs automatically from the existing cron. No port 80 and no DNS access are required.

---

## 2. The environment

```
                        Internet
                           |
                    [102.207.206.28]  ← public IP lives HERE
                           |            (on the gateway 10.0.225.1, NOT on a VM)
        +------------------+
        | Gateway 10.0.225.1|  forwards 443 → 10.0.225.15:443 (L4 DNAT)
        | (not user-owned)  |  does NOT forward 80
        +------------------+
                           |
              physical LAN 10.0.225.0/24 (Proxmox vmbr0 / eno1)
                           |
        +------------------+------------------+
        | Proxmox host 10.0.225.10 (zanajira) |  hypervisor only
        +------------------+------------------+
                           |
        +-------+-------+-------+
        | VM100 | VM103 | VM104 |   (all on 10.0.225.0/24)
        |nextjs-|nextjs-|postgres|   VM104 = the CSMS app + nginx
        | prod  | test  | -test  |        IP 10.0.225.15
        +-------+-------+-------+
```

On VM 104 (`10.0.225.15`) the relevant services are:

| Service | Listen ports | Notes |
|---|---|---|
| **nginx (aaPanel)** | `0.0.0.0:80`, `0.0.0.0:443` | Serves the site + terminates TLS. Binary `/www/server/nginx/sbin/nginx` (symlinked from `/usr/bin/nginx`). Pidfile `/www/server/nginx/logs/nginx.pid`. |
| **SoftEther vpnserver** | `992, 8443, 5550, 1194` | VPN server installed previously. **Occupies 8443** — do not use 8443 for acme.sh. |
| **WireGuard `wg0`** | `51820` (and `10.0.0.1/24`, `10.8.0.1/24` tun) | Its `PostUp` adds iptables DNAT rules for `102.207.206.28` on `wg0` — these are a **dead path** (0 packets) and were a red herring. |
| Next.js CSMS app | `9002` | The application nginx proxies to. |

Key interfaces on VM 104: `enp6s18` (LAN, `10.0.225.15`) is where gateway-forwarded traffic arrives. Default gateway is `10.0.225.1`.

---

## 3. How renewal was supposed to work (and why it broke)

aaPanel's Let's Encrypt module uses **HTTP-01** validation by default: it writes a file under `/.well-known/acme-challenge/` and Let's Encrypt fetches it over **port 80**.

This worked on 2026-04-23 (the previous cert was issued then), so **port 80 was open at the gateway at that time**. Between April and July the gateway stopped forwarding port 80 (the change coincided with the WireGuard/SoftEther VPN work, but the VPN was on the VM, not the gateway — the real cause is simply that the gateway's port-80 forward was removed/never restored). With port 80 blocked, every HTTP-01 renewal fails with "Timeout during connect."

The site kept working over HTTPS because the gateway still forwards **443**.

---

## 4. Diagnosis (what proved the cause)

Run from the server, in order:

1. **Confirm the block is real and external** (not just local):
   ```bash
   # Real internet TCP reachability (check-host.net API), from the server:
   RID=$(curl -s "https://check-host.net/check-tcp?host=test.zanajira.go.tz:80&max_nodes=5" -H "Accept: application/json" | python3 -c "import sys,json;print(json.load(sys.stdin)['request_id'])")
   sleep 12; curl -s "https://check-host.net/check-result/$RID" -H "Accept: application/json"
   # → all nodes "Connection timed out" for :80
   # → some nodes succeed for :443
   ```
   Result: **443 reachable, 80 not.** This alone shows the block is upstream, not on the VM.

2. **Confirm the VM itself is fine on 80**:
   ```bash
   ss -tlnp | grep -E ':80 |:443 '        # nginx listening on both
   ufw status | grep -E '80|443'         # both ALLOW IN from Anywhere
   curl -k -H "Host: test.zanajira.go.tz" https://127.0.0.1/   # 200
   ```
   nginx listens on 80, ufw allows 80, the vhost serves `.well-known` correctly → the VM is not the problem.

3. **Find where the public IP lives**:
   ```bash
   ip -4 addr show | grep 102.207.206.28          # NOT on the VM
   ip route get 102.207.206.28                     # → via 10.0.225.1 (the gateway)
   ```
   The public IP routes through `10.0.225.1`, which is the device doing the port forwarding.

4. **Confirm the gateway isn't a VM you control** (on the Proxmox host):
   ```bash
   qm list                                        # 3 VMs: 100, 103, 104
   ip neigh | grep 10.0.225.1                     # MAC 00:22:bd:... (not any VM's MAC)
   for p in 22 80 443 8291 8006; do ...; done      # no admin ports open → can't log in
   ```
   `10.0.225.1` is an external device with no open admin ports → **port 80 cannot be opened by the server team**.

5. **DNS-01 also impossible**: `dig NS zanajira.go.tz` → `ns1/ns2.egaz.go.tz` (eGA). No DNS API and no way to reach eGA to add TXT records.

**Conclusion:** both HTTP-01 (needs port 80) and DNS-01 (needs DNS write access) are blocked. The remaining option is **TLS-ALPN-01**, which uses **port 443**.

---

## 5. The solution — TLS-ALPN-01 with an iptables redirect

### Why it's not straightforward
TLS-ALPN-01 requires something to answer on **443** with a special TLS handshake (ALPN `acme-tls/1`). nginx already occupies 443, so the naive approach (stop nginx, let acme.sh bind 443) fails here because:
- nginx gets restarted within ~1 second (init-script/stale-pidfile behavior), stealing 443 back mid-validation → Let's Encrypt reports `tls: no application protocol`.
- Even if nginx stayed down, SoftEther's `vpnserver` and the watchdog behavior make "stop nginx" unreliable.

### The trick: keep nginx up, redirect only during validation
Add a temporary `iptables` rule so that **new inbound 443 connections are redirected to acme.sh on port 9443** for the ~15 seconds of validation. nginx keeps running (existing user sessions are unaffected); only new connections during that window hit acme.sh. Then remove the rule.

```
  LE validates:443 → gateway DNAT → 10.0.225.15:443
                                        |
                        iptables PREROUTING REDIRECT --to-ports 9443
                                        ↓
                               acme.sh standalone ALPN :9443  ✓
```

Port 9443 was chosen because 8443 is taken by SoftEther; 9443/4433/10443 are free.

### The one-time commands that issued the cert
```bash
ACME=/root/.acme.sh/acme.sh

# 1. Add the redirect (enp6s18 = LAN interface from the gateway)
iptables -I INPUT 1 -p tcp --dport 9443 -j ACCEPT
iptables -t nat -I PREROUTING 1 -i enp6s18 -p tcp --dport 443 -j REDIRECT --to-ports 9443

# 2. Issue via TLS-ALPN-01 on 9443
$ACME --issue -d test.zanajira.go.tz --alpn --standalone --tlsport 9443 \
      --listen-v4 --server letsencrypt --force

# 3. Remove the redirect (fail-safe: always do this)
iptables -t nat -D PREROUTING -i enp6s18 -p tcp --dport 443 -j REDIRECT --to-ports 9443
iptables -D INPUT -p tcp --dport 9443 -j ACCEPT

# 4. Install into aaPanel's cert path atomically, then reload nginx
CERTDIR=/www/server/panel/vhost/cert/test.zanajira.go.tz
cp /root/.acme.sh/test.zanajira.go.tz_ecc/fullchain.cer $CERTDIR/fullchain.pem.new
cp /root/.acme.sh/test.zanajira.go.tz_ecc/test.zanajira.go.tz.key $CERTDIR/privkey.pem.new
chmod 600 $CERTDIR/*.new
# verify key matches cert (ECC pubkey) before swapping:
openssl x509 -in $CERTDIR/fullchain.pem.new -noout -pubkey > /tmp/c.pub
openssl ec  -in $CERTDIR/privkey.pem.new -pubout -out /tmp/k.pub
diff -q /tmp/c.pub /tmp/k.pub && mv -f $CERTDIR/fullchain.pem.new $CERTDIR/fullchain.pem \
                              && mv -f $CERTDIR/privkey.pem.new $CERTDIR/privkey.pem
nginx -s reload
```

---

## 6. The automation (already configured)

`acme.sh` was installed at `/root/.acme.sh` and its cron is active:
```
56 5,11,17,23 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```
(runs 4×/day; acme.sh only actually renews when within ~30 days of expiry).

The per-domain config `/root/.acme.sh/test.zanajira.go.tz_ecc/test.zanajira.go.tz.conf` stores everything the cron needs:

| Field | Value |
|---|---|
| `Le_API` | Let's Encrypt (`https://acme-v02.api.letsencrypt.org/directory`) |
| `Le_Webroot` | `alpn,no` (standalone ALPN) |
| `Le_TLSPort` | `9443` |
| `Le_RealFullChainPath` | `/www/server/panel/vhost/cert/test.zanajira.go.tz/fullchain.pem` |
| `Le_RealKeyPath` | `/www/server/panel/vhost/cert/test.zanajira.go.tz/privkey.pem` |
| `Le_ReloadCmd` | `nginx -s reload` |
| `Le_PreHook` | adds iptables redirect 443→9443 + INPUT 9443 accept |
| `Le_PostHook` | removes both iptables rules |
| `Le_NextRenewTimeStr` | `2026-09-19T10:33:14Z` |

The hooks (base64-encoded in the conf) decode to:

```bash
# Le_PreHook  — run before validation
iptables -I INPUT 1 -p tcp --dport 9443 -j ACCEPT || true
iptables -t nat -I PREROUTING 1 -i enp6s18 -p tcp --dport 443 -j REDIRECT --to-ports 9443 || true

# Le_PostHook — run after (cleanup)
iptables -t nat -D PREROUTING -i enp6s18 -p tcp --dport 443 -j REDIRECT --to-ports 9443 || true
iptables -D INPUT -p tcp --dport 9443 -j ACCEPT || true
```

So a scheduled renewal runs: **pre-hook (redirect on) → standalone ALPN on 9443 → install-cert to aaPanel paths → `nginx -s reload` → post-hook (redirect off)**. Fully automatic. No manual steps, no port 80, no DNS.

aaPanel's `info.json` was also updated to show the new expiry, so the panel UI doesn't flag the cert as expired.

---

## 7. Verification

```bash
# Locally: nginx serving the new cert?
echo | openssl s_client -servername test.zanajira.go.tz -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
# subject=CN = test.zanajira.go.tz / issuer=Let's Encrypt CN=YE1 / notAfter=Oct 20 ...

# Locally: HTTPS 200?
curl -k -H "Host: test.zanajira.go.tz" https://127.0.0.1/ -o /dev/null -w "%{http_code}\n"

# Externally (real internet): use check-host.net check-http — should be HTTP 200 with valid TLS
RID=$(curl -s "https://check-host.net/check-http?host=https://test.zanajira.go.tz/&max_nodes=5" \
      -H "Accept: application/json" | python3 -c "import sys,json;print(json.load(sys.stdin)['request_id'])")
sleep 20; curl -s "https://check-host.net/check-result/$RID" -H "Accept: application/json"
# → each node: [1, <time>, "OK", "200", "102.207.206.28"]

# What acme.sh has saved:
/root/.acme.sh/acme.sh --info -d test.zanajira.go.tz
```

---

## 8. Future steps to avoid this kind of deep investigation

### A. Add early warning so you never get surprised by an expiring cert
The cert expires silently — by the time browsers reject it, it's already too late. Add a simple expiry monitor:

```bash
# /etc/cron.daily/cert-expiry-check  (chmod +x)
DAYS=30
end=$(date -d "$(openssl x509 -in /www/server/panel/vhost/cert/test.zanajira.go.tz/fullchain.pem -noout -enddate | cut -d= -f2)" +%s)
now=$(date +%s)
left=$(( (end - now) / 86400 ))
if [ "$left" -lt "$DAYS" ]; then
  echo "WARNING: test.zanajira.go.tz cert expires in $left days" \
    | mail -s "Cert expiring: test.zanajira.go.tz" ops@zanajira.go.tz
fi
```
(Replace `mail` with a Telegram/Slack webhook if email isn't set up.) The goal: learn about a renewal problem **weeks** before expiry, not on the day it breaks.

### B. When a renewal fails, check these first (90 seconds, not 3 hours)
Run this checklist before deep debugging:

1. **Is the cert actually expiring/expired?**
   `openssl x509 -in <fullchain.pem> -noout -enddate`
2. **Is 443 reachable from the internet? 80?** (check-host.net) — this instantly tells you if it's a firewall/gateway problem vs. an app problem.
3. **Is nginx up and serving?** `curl -k https://127.0.0.1/ -H "Host: <domain>"`
4. **Did the acme.sh cron run?** `tail -50 /root/.acme.sh/acme.sh.log` (look for the last renewal attempt and its error).
5. **Run a renewal manually to see the live error:**
   ```bash
   /root/.acme.sh/acme.sh --renew -d test.zanajira.go.tz --force 2>&1 | tail -40
   ```
   Because the hooks are saved, this performs the whole redirect flow and shows exactly where it fails.

If the manual renew succeeds, the issue was transient. If it fails, the error message (timeout, "no application protocol", port-in-use, etc.) points directly at the layer.

### C. Keep the iptables-redirect approach stable
- **Don't start another service on port 9443.** If 9443 becomes busy, pick another free port (4433, 10443) and update `Le_TLSPort` + both hooks in the acme.sh conf.
- **Don't stop nginx manually** as a renewal strategy — it doesn't work here. The redirect method is the supported path.
- **If you change the LAN interface name** (it's `enp6s18` in the hooks), update the hooks too, or the redirect won't match.

### D. The permanent fix (whenever access allows) — switch back to plain HTTP-01
This whole workaround exists only because port 80 and DNS are both out of reach. Either of these removes the need for the iptables-redirect trick:

1. **Best:** Get the gateway team to re-open/forward `public:80 → 10.0.225.15:80`. Then plain aaPanel HTTP-01 works again with zero downtime and zero custom scripts. Delete the acme.sh ALPN config and use aaPanel's built-in renewal.
2. **Alternative:** If eGA ever provides a DNS API (or you can add a one-time CNAME), switch acme.sh to **DNS-01** with an API for fully automatic, no-downtime renewal that doesn't even need 443 to be free.

Until then, the TLS-ALPN-01 + redirect setup renews reliably every ~60 days with only a ~15-second blip for new connections during validation.

### E. Document the gateway relationship
The single most time-consuming part of this investigation was finding that the public IP and port forwarding live on an external, unmanaged gateway — not on the VM or the Proxmox host. Keep a one-page network map (like Section 2 above) with the team so the next person doesn't have to rediscover it.

---

## 9. Lessons learned (gotchas)

- **`systemctl stop nginx` is unreliable here** (aaPanel's init script vs. systemd pidfile tracking). Avoid stopping nginx as part of any automated process.
- **Never point `--install-cert` at the live cert path during a fresh `--issue`.** If the source cert is missing, acme.sh truncates the destination file to 0 bytes and nginx can't start. Always issue to acme.sh's home first, verify, then atomic `mv` install.
- **`/usr/bin/nginx` is a symlink to `/www/server/nginx/sbin/nginx`** (aaPanel's build), and its pidfile is `/www/server/nginx/logs/nginx.pid`. So `nginx -s reload` reloads the correct master. There is also a *separate* containerized `nginx -g daemon off` — ignore it; it's not on 443.
- **SoftEther `vpnserver` holds 8443** (and 992/5550/1194). Never use 8443 for acme.sh.
- **The WireGuard `PostUp` DNAT rules** for `102.207.206.28` on `wg0` are a dead path (0 packets). They look like they should forward the public IP but they don't — the gateway does it directly. Don't be misled by them.
- **"Timeout during connect" from Let's Encrypt is authoritative** — it means LE (a real internet client) couldn't reach the port. Trust it over local `curl`/`ping` from the server (which may be hairpin-blocked to its own public IP and give false negatives).

---

## 10. Quick reference

```bash
DOMAIN=test.zanajira.go.tz
CERTDIR=/www/server/panel/vhost/cert/$DOMAIN

# Current cert expiry
openssl x509 -in $CERTDIR/fullchain.pem -noout -enddate

# What acme.sh has configured
/root/.acme.sh/acme.sh --info -d $DOMAIN

# Force a renewal now (uses saved hooks — full redirect flow)
/root/.acme.sh/acme.sh --renew -d $DOMAIN --force

# Last renewal log
tail -60 /root/.acme.sh/acme.sh.log

# External reachability of 80 vs 443
for p in 80 443; do
  RID=$(curl -s "https://check-host.net/check-tcp?host=$DOMAIN:$p&max_nodes=3" -H "Accept: application/json" \
        | python3 -c "import sys,json;print(json.load(sys.stdin)['request_id'])")
  sleep 12; echo "port $p:"; curl -s "https://check-host.net/check-result/$RID" -H "Accept: application/json"
done

# Verify nginx healthy + cert served locally
systemctl is-active nginx
ss -tlnp | grep -E ':443 |:80 '
curl -k -H "Host: $DOMAIN" https://127.0.0.1/ -o /dev/null -w "https: %{http_code}\n"
```