FROM swift:6.2-noble AS build
WORKDIR /app
COPY Sources Sources
RUN mkdir bin && swiftc -swift-version 5 -O Sources/*.swift -o bin/actuarial-engine
FROM node:22-bookworm-slim AS node
FROM swift:6.2-noble
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=build /app/bin bin
COPY server.mjs .
ENV HOST=0.0.0.0 PORT=8790 TZ=Europe/Istanbul
RUN useradd -m actuarial
USER actuarial
EXPOSE 8790
CMD ["node", "server.mjs"]
