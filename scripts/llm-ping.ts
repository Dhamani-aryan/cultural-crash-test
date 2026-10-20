/** Checks the LLM sign-in works: npm run live scripts/llm-ping.ts */
import { getLlm } from "../src/lib/llm";

const reply = await getLlm().generateText({ system: "Reply with one word.", prompt: "Say ready." });
console.log(`${reply.model}: ${reply.text.trim()} (${reply.ms}ms)`);
