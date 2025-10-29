## Multi‑stage Dockerfile for building and running the STRATUS demo.
#
# Stage 1: Build the client using Node and Vite. This stage installs
# the dependencies in the client folder and runs `npm run build` to
# produce the production build into the `dist` directory.

# The client does not require a build step because it is plain
# JavaScript and HTML. We simply copy the client source files into
# the final image.
FROM node:18-bullseye AS client-build
WORKDIR /usr/src/app/client
COPY ../../client/ ./

# Stage 2: Build the server and install dependencies. Copy over the
# compiled client from the previous stage into `public/` so Express
# can serve the static files.
FROM node:18-bullseye AS server-build
WORKDIR /usr/src/app/server
# No external dependencies are required for the server; copy sources directly.
COPY ../../server/ ./
COPY --from=client-build /usr/src/app/client ./public

# Final stage: create a slim Node image containing only the server
# sources and the compiled client. This results in a small and
# efficient production container.
FROM node:18-slim
WORKDIR /usr/src/app
COPY --from=server-build /usr/src/app/server .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
