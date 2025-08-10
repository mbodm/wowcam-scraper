# wowcam-scraper
WOWCAM backend service to scrape addon data from the web

- It's a very simple web scraper REST API service (using _Playwright_)
- It's a small _Node.js_ project
  - using `playwright` as the only runtime dependency
  - using ES-Modules `import` statements (instead of CommonJS `require` statements)
  - using promises (via `async/await` statements)
  - using `esbuild` to create a single release-file (`scrape.mjs`)
  - only offers a single HTTP GET endpoint
  - see the `src` folder and the `package.json` for details
- Docker and Caddy are used for deployment
  - Docker
    - the official Playwright Docker image is used as base image
    - the `npm install playwright` also happens in the created image
    - the release-file is copied into the created image
    - the release-file is started by Node.js in the created image
    - see `Dockerfile` for details
  - Reasons for a custom Docker image:
    - to use no bind mount or host polution stuff (caching `node_modules` etc.) when using Docker-Compose
    - stable production deployment
  - Caddy
    - used as revery proxy
    - used for HTTPS handling
    - see the `Caddyfile` for details
  - Docker-Compose
    - to define the network
    - to start the Caddy container (the official Caddy image is used)
    - to build above custom Docker image (containing release-file, Node and Playwright)
    - to start that custom image as container
    - to shutdown all the containers
    - to view the logs of the containers
    - no bind mount or host polution (caching `node_modules`) is used
    - see `docker-compose.yml` file for details
 - All build and deployment is controlled by a few `npm run` scripts (see `package.json`)

 #### Have fun.
