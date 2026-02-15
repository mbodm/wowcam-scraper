# wowcam-scraper

WOWCAM backend service to scrape addon data from the web

### What?

- It's a very simple web scraper REST API service (written in pure JS)
- It's a small Node.js project
  - offering only a single HTTP GET endpoint
  - using ES-Modules `import` statements only (no CommonJS `require` statements)
  - using promises (via `async/await` statements)
  - using `esbuild` to create a single release-file (`release/scrape.mjs`)
  - no external packages/dependencies (besides the `esbuild` dev dependency)
  - see `src` folder and `package.json` for details
- Docker and Caddy are used for deployment
  - Docker Compose
    - to define the network
    - to start the official Node.js LTS Docker image (to run the release-file)
    - to start the official FlareSolverr Docker image (to scrape the sites)
    - to start the official Caddy Docker image (to provide HTTPS support)
    - to shut down all the containers
    - to view the logs of the containers
    - to restart all at once
    - no bind mount or host pollution (caching `node_modules` etc.) is used
    - see `docker/docker-compose.yml` for details
  - Caddy
    - used as reverse proxy
    - used for HTTPS handling
    - see `docker/Caddyfile` for details
- All build and deployment is controlled by `npm run` scripts (see `package.json`)
- A complete rebuild & restart is triggered by running the `npm run release` script

### Why?

To have some backend REST API service, which scrapes & serves addon download URLs,
which are used by my WOWCAM application (acting as a simple Windows or macOS "client").

### How?

- By using on-premise hosting on my [netcup](https://www.netcup.com) server
- By developing everything directly on that machine (remote)
- By using _VS Code_ with active _Remote SSH_ extension
- By using a DNS A-Record for the subdomain
- By using Caddy for the HTTPS support (see above)
- By deploying everything in Docker containers (see above) for better stability and security

### Vibe coding?

- I initially built this project manually as a senior software developer with 25+ years of experience
- Today the project is developed and maintained with AI assistance (primarily Anthropic and OpenAI)
- AI agents can use the [AGENTS.md](AGENTS.md) file for repository-specific guidance
- No changes are released before I personally review them in detail

### Production caveats?

- This service depends on FlareSolverr and the target site's page behavior
- Any upstream changes will require corresponding adjustments in this service (by design)
- The scraper is intentionally lightweight and may need quick updates when target markup changes
- Error responses may include brief internal diagnostics for devs (but never tokens or stack traces)
- Service availability depends on all three containers (`node` / `flaresolverr` / `caddy`) being healthy
- But all of this is "by design" and intentional

#### Have fun.
