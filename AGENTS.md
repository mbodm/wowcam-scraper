# AGENTS.md

This file defines how coding agents should work in this repository.

## Project Context

- Stack: Node.js (ESM, no framework), Docker Compose, Caddy, FlareSolverr
- Source code: `/src`
- Bundled runtime artifact: `/release/scrape.mjs`
- Runtime topology:
  - `node` container runs `release/scrape.mjs`
  - `flaresolverr` container provides anti-bot scraping API
  - `caddy` container reverse-proxies public traffic to Node

## Goals

- Keep the API stable and minimal.
- Prioritize reliability and predictable operations over cleverness.
- Make production-impacting changes explicit and low-risk.

## Coding Rules

- Use modern ESM JavaScript only.
- Prefer small, pure functions with explicit input validation.
- Never silently swallow errors (the API is designed to offer internal details, on purpose).
- Avoid adding dependencies unless there is a clear operational benefit.
- Keep responses human-friendly JSON (the API is designed for inspecting responses directly in the browser).
- Keep log messages short and structured enough for container logs.

## API and Error Handling

- Use clear HTTP status mapping:
  - `400` invalid client input
  - `404` resource not found
  - `502` upstream/dependency failure (i.e. FlareSolverr API or target site)
  - `500` unexpected internal failures
- Add timeouts/abort behavior to all outbound HTTP calls.
- Ensure unexpected handler exceptions are caught and converted to safe responses.

## Security and Production Baseline

- Treat all request headers and query parameters as untrusted input.
- Do not publish internal service ports unless required.
- Prefer pinned Docker image tags over `latest`.
- Add/keep container hardening where practical:
  - non-root user
  - read-only FS where possible
  - healthchecks
  - restart policy
- The API is an internal technical API: return concise, sanitized exception messages directly in responses so developer users can diagnose issues quickly; never include secrets/tokens, never include stack traces, and keep payloads small.
- If a change could expose sensitive data (secrets/tokens), increase response verbosity excessively (for example stack traces), or enable API misuse, explicitly warn the user before proceeding.

## Performance and Stability

- Keep scraper logic resilient to minor HTML/layout changes.
- Avoid unbounded waits and unbounded memory growth.
- Keep request handling non-blocking and idempotent.

## Working Agreement for Agents

- Before changing behavior, inspect:
  - `src/app.js`
  - `src/api/*.js`
  - `src/curse/*.js`
- Never change operational config without explicitly asking user for it. This includes:
  - `docker/Caddyfile`
  - `docker/docker-compose.yml`
- For non-trivial changes, update both source and any operational config that must stay aligned, but for the latter, explicitly ask the user first.
- Always prefer minimal patches over broad rewrites.
- Do not make destructive git actions (`reset --hard`, force checkout, deleting unrelated files).
- If the workspace has unrelated edits, do not revert them.

## Validation Checklist

After code changes, run what is available:

1. `npm run build`
2. If Docker is available: `docker compose -f docker/docker-compose.yml config`
3. Smoke-check endpoints (for example `/` and `/scrape?addon=...`) in the running stack.
4. `npm run release` is the build script, which creates `release/scrape.mjs` and restarts all Docker containers.

If a command cannot run in the current environment, state that clearly in the final report.

## Preferred Change Style

- Keep diffs small and reviewable.
- Add comments only where logic is genuinely non-obvious.
- Include file/line references when reporting findings.
- When in doubt, choose the more observable and operationally safe option.
