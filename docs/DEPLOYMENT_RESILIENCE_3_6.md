# Deployment resilience and final polish 3.6

## Corrected deployment target

The production hostname is `puzzleplatformer.pages.dev`, so `wrangler.jsonc` now uses `pages_build_output_dir` and the project name `puzzleplatformer`. Workers Static Assets remains available only through `wrangler.worker.jsonc` and a manual workflow. This prevents a Workers deployment from being mistaken for the Pages deployment serving the public hostname.

## Runtime recovery

- visible logo-backed loading screen with per-asset progress
- one automatic asset retry and a user-facing reload action on failure
- visible online, offline, runtime-error, and service-worker update messages
- one-click update activation through `SKIP_WAITING`
- navigation preload
- cached navigation fallback on network failures and HTTP 5xx responses
- update-safe response caching rules in `_headers`

## Deployment proof

The build generates `health.json` with the app version, deterministic content revision, target platform, and production asset count. GitHub Actions deploys to Pages and runs a retrying HTTP smoke against both the immutable deployment URL and `puzzleplatformer.pages.dev`.

The local release gate launches `wrangler pages dev` and verifies the same application shell, health payload, manifest, and production sprite atlas before packaging.
