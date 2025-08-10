FROM mcr.microsoft.com/playwright:v1.54.0-noble
USER pwuser
WORKDIR /app
RUN npm install playwright
COPY release/scrape.mjs ./scrape.mjs
CMD ["node", "scrape.mjs"]
