# Contributing

Thanks for your interest in contributing to unInsta.

## Getting Started

1. Fork the repo and clone it
2. `npm install`
3. `npm run build` to verify everything works

## Development

The source is in `src/`, written in TypeScript. The build produces both a Tampermonkey userscript and a browser extension from the same codebase.

```bash
npm run typecheck    # Type-check without emitting
npm run build        # Full build (typecheck + bundle + obfuscate)
npm run dev          # Watch mode (unobfuscated, for local development)
```

### Project Structure

```
src/
  main.ts           Entry point, wires all modules together
  types.ts          Shared TypeScript interfaces
  interceptor.ts    Patches window.fetch to capture x-ig-app-id
  auth.ts           Extracts credentials from cookies/session
  api.ts            Instagram REST API client
  engine.ts         Core unsend loop with rate limiting
  ui.ts             Floating panel DOM construction
  picker.ts         Click-to-pick boundary message
  styles.ts         CSS using Instagram's CSS variables
  background.ts     Extension service worker
  bridge.ts         ISOLATED-to-MAIN world message bridge
```

### Testing Locally

**As extension:** Load `dist/extension/` as an unpacked extension in Chrome/Edge, or as a temporary add-on in Firefox.

**As userscript:** Copy the contents of `dist/uninsta.user.js` into a new Tampermonkey script.

## Submitting Changes

1. Create a branch from `main`
2. Make your changes
3. Run `npm run build` to verify the build passes
4. Open a pull request against `main`

Keep PRs focused -- one feature or fix per PR.

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- Browser and extension/userscript version
- Any console errors (open DevTools with F12)

## Code Style

- TypeScript strict mode
- No runtime dependencies
- Follow existing patterns in the codebase
