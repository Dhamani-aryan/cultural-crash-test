# Cultural Crash-Test

> Find the cultural mismatch before launch. Then fix it.

A launch plan is full of cultural bets: the music act, the collaboration brand, the pop-up venue, the creative direction. Cultural Crash-Test is an agent that treats each one as a hypothesis and tests it against [Qloo](https://www.qloo.com/)'s taste graph for the audience and city you are launching to. It finds the weakest-supported choice, researches a better-supported alternative in Qloo, swaps only that choice and re-tests the whole plan, with every decision traceable to a recorded Qloo query.

Built for the **Qloo Agentic Hackathon 2026**. Work in progress.

- Product and build plan: [`docs/PLAN.md`](docs/PLAN.md)
- Decisions and evidence: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- API research: [`research/`](research/) (probe scripts; raw responses are never committed)
- The earlier Transcreate prototype, whose Qloo engine this builds on, is at the tag `transcreate-final`.

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
