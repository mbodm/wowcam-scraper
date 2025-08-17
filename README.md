# wowcam-scraper

WOWCAM backend service to scrape addon data from the web

### What?

- It's a very simple web scraper REST API service (written in pure JS)
- It's a small Node.js project
  - offering only a single HTTP GET endpoint
  - using ES-Modules `import` statements (not CommonJS `require` statements)
  - using promises (via `async/await` statements)
  - using `esbuild` to create a single release-file (`scrape.mjs`)
  - no external packages/dependencies (besides the `esbuild` dev dependency)
  - see the `src` folder and the `package.json` for details
- Docker and Caddy are used for deployment
  - Docker-Compose
    - to define the network
    - to start the official Node.js LTS Docker image (to run the release-file)
    - to start the official FlareSolverr Docker image (to scrape the sites)
    - to start the official Caddy Docker image (to provide HTTPS support)
    - to shutdown all the containers
    - to view the logs of the containers
    - to rebuild and restart all at once
    - no bind mount or host polution (caching `node_modules` etc.) is used
    - see `docker-compose.yml` file for details
  - Caddy
    - used as revery proxy
    - used for HTTPS handling
    - see the `Caddyfile` for details
- All build/deployment is controlled by `npm run` scripts (see `package.json`)

### Why?

To have a backend REST API service, which scrapes & serves addon download URLs,
which are used by my WOWCAM application (acting as a simple "Windows client").

### How?

- By using on-premise hosting on my server
- By developing everything directly on that machine (remote)
- By using _VS Code_ with active _Remote SSH_ extension
- By using an A-RECORD entry for the sub domain
- By using Caddy for the HTTPS support (see above)
- By deploying everything stable and secure in Docker containers (see above)

#### Have fun.
