# RecallOS roadmap

## Shipped in the hackathon build

- [x] Signed-in conversation extraction with server-only AI Gateway helpers.
- [x] Ambient Guard redaction before extraction and persistence.
- [x] Exact quote validation and owner-scoped saved imports with Supabase RLS.
- [x] Protected MCP tools, resources, prompts, structured voice contracts, and Alexa+ web simulator.
- [x] Temporal drift, supersession history, deterministic facts/charts, bounded agent turns, export, and confirmed deletion receipts.
- [x] Tests for privacy redaction, evidence grounding, no-match behavior, charts, agent bounds, and unauthenticated MCP rejection.

## Next production hardening

- [ ] Replace derived-on-read memory with versioned memory revisions and append-only consolidation events.
- [ ] Add official MCP SDK conformance tests, session lifecycle, SSE negotiation, OAuth 2.1/PKCE metadata, and narrow scopes.
- [ ] Add typed claim/evidence freshness, evidence hashes, `INCONCLUSIVE`, and `SOURCE_UNAVAILABLE` outcomes.
- [ ] Make follow-ups timezone-aware, durable, retry-safe, and delivery-audited.
- [ ] Add MemoryAgentBench-style incremental retrieval/conflict regression cases.
