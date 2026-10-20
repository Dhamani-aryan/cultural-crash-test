# Transcreate

> Translate cultural references, not just words.

Normal translation handles the language. Much of what ads, pitches, comedy and game dialogue *mean* lives in cultural references: brands, artists, shows, places. Those break when the content crosses a border. Transcreate finds every reference in a text, works out the job it does for its home audience, and uses [Qloo](https://www.qloo.com/)'s taste graph to find what does the same job for a matching audience in another city. It then rewrites the text, with evidence for every swap.

Built for the **Qloo Agentic Hackathon 2026**. Work in progress.

- Product plan: [`docs/PLAN.md`](docs/PLAN.md)
- API research behind the plan: [`research/`](research/) (probe scripts; raw responses are never committed)

## Run locally

Requires Node.js 22+ and a Qloo hackathon key.

```bash
npm ci
cp .env.example .env.local   # set QLOO_API_KEY
npm run dev
```

Checks: `npm test`, `npm run typecheck`, `npm run lint`.

## License

[MIT](LICENSE)
