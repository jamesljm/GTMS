# AI Laptop Setup — Ollama + Gemma 3n E2B

Setup guide for running Gemma 3n E2B on a dedicated laptop, exposed over LAN so the GTMS prod laptop can call it for parsing/chat.

Default OS assumed: **Windows**. macOS/Linux is similar — Ollama works the same.

---

## Step 1 — Install Ollama

1. Download from **https://ollama.com/download**
2. Run the installer
3. Verify Ollama appears in the system tray
4. Confirm in a terminal:
   ```
   ollama --version
   ```

## Step 2 — Pull Gemma 3n E2B

```
ollama pull gemma3n:e2b
```

(~3 GB download.)

Verify:
```
ollama list
```
Should show `gemma3n:e2b`.

## Step 3 — Test the model locally

```
ollama run gemma3n:e2b
```

Type a sample prompt to confirm it works. `/bye` to exit.

## Step 4 — Make Ollama listen on the network

By default, Ollama only accepts connections from `localhost`. We need to change that so the GTMS laptop can reach it.

**Windows:**

1. `Win + R` → `sysdm.cpl` → Enter
2. **Advanced** tab → **Environment Variables**
3. Under **User variables** click **New**:
   - Name: `OLLAMA_HOST`
   - Value: `0.0.0.0:11434`
4. OK, OK
5. **Quit** Ollama from the system tray (right-click icon → Quit)
6. Restart Ollama (Start menu → Ollama)

**macOS:**

```
launchctl setenv OLLAMA_HOST 0.0.0.0:11434
```
Then restart Ollama (cmd-Q the menu bar app, reopen).

**Linux (systemd):**

Edit `/etc/systemd/system/ollama.service.d/override.conf`:
```
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```
Then `sudo systemctl daemon-reload && sudo systemctl restart ollama`.

## Step 5 — Find the AI laptop's IP

```
ipconfig
```
(or `ifconfig` / `ip addr` on macOS/Linux)

Note the `IPv4 Address` of the active network adapter — e.g. `192.168.1.42`. This is the address GTMS will hit.

## Step 6 — Allow Ollama through the firewall (Windows)

1. Open **Windows Defender Firewall with Advanced Security**
2. **Inbound Rules** → **New Rule**
3. Type: **Port** → Next
4. **TCP**, specific port: `11434` → Next
5. **Allow the connection** → Next
6. Apply to **Private** networks only (leave Public unchecked) → Next
7. Name: `Ollama` → Finish

## Step 7 — Test from the GTMS laptop

In PowerShell on the GTMS laptop:
```
curl http://<ai-laptop-ip>:11434/api/tags
```

Expected: JSON listing the installed models. If yes — done.

If it fails:
- Both laptops on the same WiFi/network?
- Was `OLLAMA_HOST` saved before restarting Ollama? Check with `echo $env:OLLAMA_HOST`
- Firewall rule actually applied? Try temporarily disabling private network firewall to isolate
- Antivirus blocking inbound connections?

## Step 8 — Connect to GTMS

Once Step 7 works, add to `packages/backend/.env` on the GTMS laptop:
```
GEMMA_API_URL=http://<ai-laptop-ip>:11434
```

Then GTMS will be wired to call Gemma for chat / parsing instead of Anthropic.

---

## Optional — keep AI reachable across networks

If the laptops aren't always on the same LAN, use **Tailscale** (free, up to 100 devices):

1. Install on both laptops: https://tailscale.com/download
2. Sign in with the same account on both
3. Each gets a Tailscale IP (looks like `100.x.x.x`)
4. Use the Tailscale IP in `GEMMA_API_URL` instead of the LAN IP — works from anywhere, end-to-end encrypted

## Notes

- Keep the AI laptop awake (set power plan to never sleep when plugged in), otherwise GTMS chat features will fail when it's asleep
- Ollama RAM usage with Gemma 3n E2B: ~3 GB (Q4) up to ~5 GB (Q8/full precision)
- First request after startup is slow (~5-10 sec to warm the model into RAM); subsequent requests ~1-3 sec
