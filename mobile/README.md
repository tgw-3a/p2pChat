# p2pChat Mobile (Native)

`mobile/` is an isolated native app workspace (Expo + React Native) so it does not interfere with the existing Spring Boot web app.

## Goals

- Native iOS/Android UI with a glassmorphism style close to your reference image
- Keep the current backend (`/login`, `/api/online`, friend APIs) reusable
- Prepare a clean place to add native-only networking modes (future: Tailscale/WireGuard strategy)

## Quick Start

```bash
cd mobile
npm install
npm run start
```

Then open:

- iOS simulator: press `i`
- Android emulator: press `a`
- Physical device: scan QR from Expo Go

## What is implemented now

- `App.tsx` mobile-first screen with:
  - scenic background
  - glass panels and blur layers
  - online/offline action buttons
  - online friend chips
  - chat timeline + input area
- Theme tokens are in `src/theme/palette.ts`
- Reusable glass component is in `src/components/GlassPanel.tsx`

## Next Implementation Steps

1. Add auth flow using your existing `/login` session or token endpoint.
2. Add API client layer and poll/heartbeat for `/api/online`.
3. Move current web `libp2p` logic into a native strategy module.
4. Add direct-first transport policy:
   - direct P2P first
   - relay fallback when direct is unavailable
5. Add optional Tailscale mode switch in settings.

## Folder Structure

```text
mobile/
  App.tsx
  app.json
  package.json
  src/
    components/
    theme/
```
