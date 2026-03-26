# Fork Notes — gene-jelly/claude-mem

> **What this is:** This is a diary of one person's experiments with AI memory, not a finished product. It documents what I tested, what worked, what didn't, and what I learned. Other agents and researchers are welcome to explore it as a case study in LLM context management.

## About this fork

This is a fork of [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem), the excellent Claude Code plugin that captures observations during coding sessions. Full credit to thedotmack for the original — it sent me down the rabbit hole of memory and context management for LLMs.

My customizations lived mostly in a separate repo ([engram](https://github.com/gene-jelly/engram)) which added multi-backend retrieval (FTS5 + ChromaDB + Neo4j), bio-inspired memory dynamics, and a "gap-detector" hook that injected relevant context on every prompt.

## Current status (March 2026)

**claude-mem is re-enabled as a pull tool, not a push hook.**

The original integration used a `UserPromptSubmit` hook to search the observation database and inject relevant context before every prompt. This worked but had a critical flaw: it busts Claude Code's prompt caching, making sessions slower and more expensive.

After disabling it entirely for 4 days (and noticing Claude "forgot" things between sessions), I settled on a middle path:

- **claude-mem stays enabled** as a plugin with MCP tools Claude can call on demand
- **The gap-detector hook stays dead** — no automatic injection on every prompt
- **MEMORY.md carries the personality layer** — dense, static, prompt-cache friendly
- **claude-mem is the recall layer** — 11K+ observations searchable when Claude actually needs them

This preserves prompt caching while keeping the full observation corpus accessible.

## Related repos

| Repo | What it is |
|------|-----------|
| [engram](https://github.com/gene-jelly/engram) | The multi-backend retrieval layer I built on top of claude-mem (push model, now retired) |
| [gene-jelly-jam](https://github.com/gene-jelly/gene-jelly-jam) | My open notebook — broader context on these experiments |

## Lessons for anyone building LLM memory systems

1. **Push vs pull matters enormously.** Injecting context on every prompt prevents the LLM service from caching your system prompt. For long sessions this can be a 10x cost difference.
2. **Personality continuity comes from a dense static preamble**, not dynamic retrieval. Pack the stuff that matters every session into a file that doesn't change between turns.
3. **Your observation database is most valuable as a searchable corpus**, not a firehose. Let the model decide when to search rather than pre-loading speculatively.
4. **FTS5 with BM25 outperforms semantic search for personal memory** when you're searching your own words for your own words. Don't reach for a vector database until keyword search actually fails.
