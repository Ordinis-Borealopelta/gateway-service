FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache curl bash && \
    curl -Ls https://cli.doppler.com/install.sh | sh

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["doppler", "run", "--", "bun", "run", "start"]
