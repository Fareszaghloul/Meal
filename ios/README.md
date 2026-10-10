# MealPrep for iOS (xtool)

A thin native iOS shell around the existing MealPrep web app. It is **not** a rewrite: a single `WKWebView` loads
`MealServerURL` (see `MealPrep/Info.plist`), so every web feature, API route and database rule stays exactly as it is.
It is built, signed and installed from Linux with [xtool](https://xtool.sh); nothing goes to the App Store or TestFlight.

## Why a wrapper

The app is a server-rendered Next.js 16 app (Prisma + PostgreSQL, cookie-session API routes). It cannot run on-device
without the server, and no Swift/SwiftPM path exists for React. The smallest change that preserves 100% of the UI and
backend contracts is a native shell that hosts the live site. Consequence: **the app needs a connection**, like the
PWA already does (the web app has no service worker by design; unsynced writes are queued in `localStorage` and retried).

## What the shell adds over Safari / the PWA

| Native behavior | Why it is needed |
|---|---|
| `alert` / `confirm` / `prompt` delegates | WKWebView drops them; without this every `confirm()`-guarded delete silently cancels |
| Camera grant for our origin only | Barcode scanner (`getUserMedia`), plus `NSCameraUsageDescription` |
| `WKDownload` + share sheet | Settings → Your data (backup, CSV export) uses blob downloads |
| Off-origin links open in Safari | Keeps the shell on the app's own origin |
| Native offline / 5xx screen with retry | Instead of raw tunnel/gateway error pages |
| Reload after web-process termination | iOS reclaims memory while backgrounded |
| Persistent website data store | Session cookie, `localStorage` write queue and theme survive restarts |

## Layout

```
ios/
  scripts/xtool.sh        sync to a Linux-native dir, then `xtool dev build` / `xtool dev`
  MealPrep/
    Package.swift         one library product = the app (xtool convention)
    xtool.yml             bundle ID, Info.plist, icon
    Info.plist            merged over xtool defaults: server URL, permission strings
    Resources/AppIcon.png opaque 1024px icon (flattened from public/icons/icon-512.png)
    Sources/MealPrep/     SwiftUI shell + WebModel (all native delegates)
```

## One-time setup (already done on this machine)

Inside Ubuntu (WSL) — run `xtool setup` (Apple sign-in + Darwin SDK). Check with:

```bash
xtool auth status
xtool sdk status
xtool devices
```

WSL note: the iPhone must be visible to WSL (`xtool devices` lists it). If it is not, attach it with `usbipd`
(`usbipd bind --busid <id>` then `usbipd attach --wsl --busid <id>` from an elevated Windows shell).

## Build and install

Always use a **login** shell so the swiftly-managed Swift toolchain is on `PATH`
(a plain `bash -c` fails with "Failed to obtain Swift version").

```bash
# compile + package only (no phone needed)
wsl -d Ubuntu-24.04 -- bash -lc "bash /mnt/c/Users/fares/Downloads/meal/ios/scripts/xtool.sh build"

# build, sign, install, launch on the connected iPhone
wsl -d Ubuntu-24.04 -- bash -lc "bash /mnt/c/Users/fares/Downloads/meal/ios/scripts/xtool.sh run"
```

Inside Ubuntu directly: `ios/scripts/xtool.sh build|run`. Set `MEALPREP_IOS_WORKDIR` to change the build directory
(default `~/mealprep-ios`). After editing any Swift file, just run `run` again; it reinstalls over the existing app and
keeps its data.

xtool registers the app as **`XTL-<TEAMID>.com.fareszaghloul.mealprep`** (it prefixes the team ID), so use that ID with
`xtool launch` / `xtool uninstall`.

## First launch on the phone (manual steps)

1. USB cable in, phone unlocked, tap **Trust This Computer**.
2. **Settings → Privacy & Security → Developer Mode → On** (phone restarts, confirm after restart).
3. If iOS says "Untrusted Developer": **Settings → General → VPN & Device Management →** your Apple ID **→ Trust**.
4. Open MealPrep, allow the camera when you first use the scanner, sign in once; the session cookie persists.

## Signing limits

With a free Apple ID, xtool's provisioning profile **expires after 7 days** (`xtool ds profiles` shows the date) and
the app stops opening. Re-run `xtool.sh run` with the phone connected to re-sign and extend it; data is preserved.
Free accounts are also limited to 3 active apps and 10 App IDs per week. A paid Developer Program membership lifts the
expiry to a year. Credentials are held by xtool's own auth store; never put them in this repo.

## Changing the server

Edit `MealServerURL` in `MealPrep/Info.plist` (must be `https`; App Transport Security stays on) and re-run `run`.
Only that host is treated as in-app; camera access is granted to that host only.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Failed to obtain Swift version` | Non-login shell. Use `bash -lc`. |
| `Waiting for device to be connected...` forever | Phone locked/not trusted, or not attached to WSL (`xtool devices`, `usbipd`). |
| Installs but `xtool launch` → `DebugserverClient.Error.unknown` | Developer Mode off or phone locked. Enable it (above), unlock, retry; or just tap the app icon. |
| App opens then closes immediately | Profile expired (>7 days) or developer not trusted. Re-run `run`; trust the profile. |
| "Can't reach MealPrep" screen | Server/tunnel down or phone offline. Retry button reloads. |
| Camera black / no prompt | Check Settings → MealPrep → Camera; the page must be served over https. |
| Safe-area/keyboard layout looks off | The shell uses `contentInsetAdjustmentBehavior = .never` with `ignoresSafeArea()` so the page sees Safari's viewport behavior (`ViewportVars.tsx` handles the keyboard); adjust in `RootView.swift`. |
