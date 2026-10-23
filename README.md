# RecallOS

**RecallOS is an evidence-grounded memory operating system for Alexa+ style
experiences.** It turns conversations into durable, owner-scoped memories,
tracks how plans change, surfaces unresolved risk, and exposes the same facts
through a protected MCP endpoint and a visual Alexa+ client.

This is the Amazon Developer Hackathon build: a privacy-first alternative to a
generic chatbot that can answer _why_ it believes something, show the exact
source passage, and say when the connected records are inconclusive.

## What makes RecallOS different

Most memory prototypes stop at semantic search. RecallOS treats memory as a
reviewable evidence system:

- **Exact quote grounding** — every extracted record must contain a verbatim
  substring of the imported transcript before it can be saved.
- **Temporal supersession** — a later deadline or plan can supersede an older
  one without erasing history.
- **Uncertainty is visible** — confirmed, inferred, conflicting, and unresolved
  claims remain distinct. A missing record is not presented as proof that an
  event never happened.
- **Ambient Guard** — secrets, passwords, payment cards, IDs, phone numbers,
  email addresses, and ambient-noise markers are redacted before extraction or
  storage.
- **Owner-scoped privacy** — cloud imports use Supabase RLS. MCP calls require
  an authenticated bearer token and read only the caller's imports.
- **Facts first, language second** — charts, counts, ranking, drift, and
  commitments are computed deterministically; a client can narrate those facts
  without inventing numbers.
- **Lifecycle controls** — authenticated users can export their saved data,
  preview deletion, delete one import, or delete all saved imports. Destructive
  MCP operations require explicit confirmation and an idempotency key.
- **Alexa+ interoperability** — MCP tools, resources, prompts, structured
  results, evidence cards, browser speech recognition, and speech synthesis are
  all available in one demo surface.

## Feature map

| Surface         | What it demonstrates                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | Risk-ranked briefing: blockers, overdue promises, unanswered questions, and changed plans                                                         |
| `/ask`          | Evidence-backed memory search with local/cloud import data                                                                                        |
| `/import`       | Conversation import, Ambient Guard preview, AI extraction, exact evidence validation, and vault save                                              |
| `/commitments`  | Firm versus tentative commitments, ownership, confidence, and completion review                                                                   |
| `/graph`        | Entity graph, relationship history, and multi-hop context                                                                                         |
| `/drift`        | Mental-model drift, temporal supersession, risk radar, and explainable claims                                                                     |
| `/insights`     | Facts-first charts for memory type, status, and source channel                                                                                    |
| `/consolidate`  | Transparent “Machine Dream” consolidation pipeline that preserves unresolved claims                                                               |
| `/alexa`        | Alexa+ / Echo Show-style visual client, real protected MCP calls when signed in, offline fallback, voice input, speech output, and tool inspector |
| `/devices`      | Authenticated Alexa account linking, Ring Appstore linking, AWS EventBridge status, server-side device discovery, and anchor-device selection |
| `POST /api/mcp` | JSON-RPC MCP tools, resources, prompts, structured content, authentication, export, deletion, and bounded agent turns                             |

## MCP surface

The endpoint is available at `/api/mcp`.

### Read and analysis tools

- `recall_get_context`
- `recall_get_briefing`
- `recall_query_memories`
- `recall_check_commitments`
- `recall_detect_drift`
- `recall_suggest_chart`
- `recall_consolidate`
- `recall_export_handoff`
- `recall_schedule_followup`
- `recall_get_core_memory_blocks`
- `recall_agent_turn` — bounded to four read-oriented tool calls

### Privacy and lifecycle tools

- `recall_get_privacy_summary`
- `recall_export_my_data`
- `recall_preview_delete_import`
- `recall_delete_import`
- `recall_delete_my_data`

The deletion tools require `confirm: true` and a client-generated `requestId`.
Receipts are stored in the owner-scoped `memory_operations` table so retries
can replay the same result instead of deleting again.

### Resources and prompts

Resources:

- `recall://context`
- `recall://memories`
- `recall://schema`

Prompts:

- `recall_weekly_review`
- `recall_prepare_handoff`
- `recall_explain_drift`

Every tool result returned over HTTP includes a stable voice-oriented envelope:

```json
{
  "ok": true,
  "spoken": "RecallOS returned an evidence-backed result.",
  "grounded": true,
  "nextStep": "Review the supporting evidence before relying on it.",
  "data": "..."
}
```

The actual domain fields remain alongside the envelope in `structuredContent`.
Relevance is never treated as truth confidence.

## Architecture

```text
Transcript / voice input
        |
        v
Ambient Guard  ->  server-only structured extraction
        |                    |
        |                    v
        |             exact quote validation
        |                    |
        v                    v
local demo vault      Supabase conversation_imports
                              |
                              | RLS: auth.uid() = user_id
                              v
                    memory-engine + temporal drift
                              |
          +-------------------+-------------------+
          |                   |                   |
       Web UI          protected /api/mcp      Alexa+ simulator
                              |
                  tools / resources / prompts
```

The canonical cloud record is the redacted conversation import. Extracted
memories are derived at request time for the demo, with operation receipts
persisted for destructive actions. This keeps the implementation small while
retaining a clear path to durable revision tables and background
consolidation.

## Local development

Requirements:

- Node.js 20.19+ (the current TanStack Router plugin requirement)
- npm
- Supabase/Lovable Cloud variables for cloud extraction, saved imports, and
  protected MCP calls

```sh
git clone <this-repository-url>
cd recallOS
npm install
npm run dev
```

Open the URL printed by Vite. The offline demo works without Supabase. Sign in
from **Import** to enable cloud vault sync, server extraction, and live
owner-scoped MCP calls from **Alexa+**.

Useful checks:

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
```

If the local `node_modules` directory was copied between operating systems and
Vite/Vitest reports a missing Rolldown native binding, reinstall dependencies
in the current environment before running the checks:

```sh
rm -rf node_modules
npm install
```

### Environment

Cloud extraction expects the variables supplied by Lovable Cloud/Supabase:

```text
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # server-only; required for deletion receipts
LOVABLE_API_KEY=...
PROVIDER_TOKEN_ENCRYPTION_KEY=... # server-only; 32-byte AES-256-GCM key
APP_BASE_URL=https://your-domain.example
RING_CLIENT_ID=...
RING_CLIENT_SECRET=... # server-only
RING_HMAC_SIGNING_KEY=... # server-only
RING_APPSTORE_URL=...
AWS_REGION=...
AWS_EVENT_BUS_NAME=...
AWS_ACCESS_KEY_ID=... # server-only
AWS_SECRET_ACCESS_KEY=... # server-only
ALEXA_SKILL_ID=...
ALEXA_ACCOUNT_LINKING_CLIENT_ID=...
ALEXA_ACCOUNT_LINKING_CLIENT_SECRET=... # server-only
ALEXA_ALLOWED_REDIRECT_URIS=...
```

Never commit `.env`, access tokens, service-role keys, or raw private
transcripts. The server-only extraction route uses the AI Gateway and stores no
provider conversation state by default. Copy `.env.example` to configure the
provider integration; never put Ring, Alexa, AWS, or encryption secrets in a
`VITE_*` variable.

### Database migration

Apply the ordered SQL migrations in `drizzle/migrations/` to the connected
Supabase project (`0000_recallos_private_imports.sql` first, then
`0001_memory_operations.sql`, then `0002_provider_connections.sql`). They create:

- `conversation_imports` — redacted, owner-scoped source imports;
- `ai_access_state` — server-side extraction availability state; and
- `memory_operations` — owner-scoped deletion receipts/idempotency records;
- `provider_connections` and `provider_connection_secrets` — owner-scoped
  links, with encrypted Ring tokens kept out of authenticated reads;
- `provider_link_claims` — short-lived, service-only Ring Appstore claims;
- `smart_home_devices` and `device_setups` — normalized devices and the
  selected anchor device;
- `provider_webhook_events` — service-only Ring webhook idempotency records;
- `alexa_oauth_requests` and `alexa_tokens` — Alexa account-linking state and
  hashed Alexa access tokens.

The migration enables RLS and restricts reads/writes to the authenticated
owner. The MCP server still derives the caller from the bearer token; it never
trusts a browser-supplied user ID.

## Hackathon demo script

1. Open `/import` and use the seeded sprint transcript.
2. Click **Preview Redaction** to show Ambient Guard's audit categories.
3. Click **Extract Evidence-Backed Memories**. Without cloud credentials,
   RecallOS uses the deterministic fixture; with a signed-in session it uses
   the server-only AI Gateway and still validates every quote.
4. Save to the local vault or sign in and save to the owner-scoped cloud vault.
5. Open `/drift` to show the Friday → Sunday deadline supersession and the
   unresolved API integration assumption.
6. Open `/insights` to show facts-checked memory charts and evidence coverage.
7. Open `/alexa`, choose **what did I promise?**, and open the MCP inspector.
   Signed-in users exercise the protected `/api/mcp` route; visitors get the
   clearly labeled offline local mode.
8. Try a custom prompt such as “why is the demo at risk?” and inspect the
   supporting quotes beside the voice response.
9. For an integration demo, call `GET /api/mcp` for discovery, then use an
   authenticated JSON-RPC `initialize`, `tools/list`, and `tools/call` flow.

Example discovery request:

```sh
curl http://localhost:5173/api/mcp
```

Example authenticated tool call (replace the placeholder with a short-lived
Supabase access token; do not put real tokens in scripts or commits):

```sh
curl -X POST http://localhost:5173/api/mcp \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <supabase-access-token>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"recall_get_context","arguments":{}}}'
```

## What was borrowed—and what was improved

RecallOS does not vendor or copy the reference repositories. Their public
licenses and copyright notices remain with their authors. We implemented the
ideas that fit this product's evidence and privacy model:

| Reference pattern                                      | RecallOS implementation                                                             | Improvement over the reference gap                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Mental Model Drift typed claims and historical changes | `/drift`, `driftEvents`, temporal supersession, status and source history           | Adds exact quote grounding and owner-scoped saved imports instead of a global graph                    |
| Alexa Memory MCP triples, ask/forget/stats             | Evidence-backed query, graph view, stats, and MCP resources                         | Adds authentication, RLS, citations, conflict state, and no unrelated fallback matches                 |
| Context-Aware Assistant memories/tasks/context         | `recall_get_context`, commitment audit, follow-up planning, and context resources   | Adds explicit uncertainty, evidence coverage, and privacy controls                                     |
| Mem0 hybrid retrieval, scoping, lifecycle thinking     | Ranked query engine, scope derived from auth, status/confidence separation          | Keeps exact source evidence canonical instead of treating vector relevance as truth                    |
| A-MEM / Letta / Machine Dream consolidation            | Consolidation page, graph-oriented entities, core-memory view                       | Makes consolidation transparent and preserves unresolved claims rather than silently rewriting them    |
| ChartKeep facts-first analysis                         | `recall_suggest_chart` and `/insights`                                              | Charts are computed from verified records and exposed with `factsChecked` and citations                |
| Recall MCP voice result contract                       | `ok`, `spoken`, `grounded`, `nextStep`, structured content                          | Makes no-match and retry guidance explicit for Alexa-shaped clients                                    |
| KindHandoff mutation safety                            | Confirmed deletion plus `requestId` replay receipts in `memory_operations`          | Adds owner RLS and data export/delete controls to the handoff model                                    |
| Yasmin evidence-driven follow-up                       | Dynamic `recall_schedule_followup` derived from unresolved/overdue memories         | Avoids hard-coded reminders and requires explicit resolution evidence                                  |
| Recall Guardian / ORF source uncertainty               | Redaction audit, exact evidence, no-match semantics, versioned export               | Keeps source provenance and privacy boundaries in the memory record                                    |
| HomeKeeper, CareMesh, Aawiz, Moot, OmniAssist          | Resources, prompts, visual evidence cards, speech input/output, bounded agent turns | Clearly labels the Alexa+ experience as a simulator unless native Amazon account linking is configured |

## Honest integration boundaries

- The `/alexa` page is an Alexa+/Echo Show **client simulation**. It can call
  RecallOS's protected MCP endpoint, but this repository does not claim a
  physical Echo device or AVS integration. The `/devices` route contains the
  server-side Alexa Smart Home account-linking and discovery endpoints, which
  require an approved Alexa skill and configured credentials.
- The MCP handler is a small JSON-RPC/HTTP adapter designed for this TanStack
  Start deployment. It implements discovery, initialization, tools, resources,
  prompts, structured results, and bearer protection; it is not a replacement
  for every behavior of the official MCP SDK's full Streamable HTTP session
  transport.
- Browser speech recognition and speech synthesis depend on the browser. The
  text prompt and offline mode remain available when microphone or provider
  APIs are absent.
- Local vault data is browser-local and should be treated as demo data. Cloud
  persistence requires Supabase migration, authentication, and RLS.
- A real production deployment should add OAuth 2.1/PKCE authorization-server
  metadata, narrow MCP scopes, rate limiting, session revocation, and an
  audited background consolidation worker.

### Live Alexa / Ring / AWS integration

The `/devices` flow uses the official integration boundaries instead of
localStorage fixtures:

```text
Alexa Smart Home account linking
        |
        v
RecallOS owner account -- Ring Appstore linking -- Ring Partner API
        |                                      |
        +-------- normalized device rows <-----+
                             |
                             v
                  Ring HMAC webhook -> EventBridge
```

Ring uses the official Appstore-first one-way account-linking flow. Ring sends
the authorization code to the server-only token-exchange endpoint; the user is
returned to the server account-link endpoint with a signed nonce; and RecallOS
claims the encrypted token only after the signed-in owner verifies that nonce.
Ring API calls are server-to-server and include the required `Hardware_Id` and
application `User-Agent` headers. Ring access and refresh tokens are encrypted
with AES-256-GCM before they are written to
`provider_connection_secrets`.

Alexa account linking uses the configured RecallOS authorization and token
endpoints. Alexa receives only a short-lived opaque access token; its hash is
stored server-side. Alexa discovery returns the owner's normalized Ring
endpoints and health state.

Ring webhooks are verified with the Ring HMAC signing key, deduplicated in
`provider_webhook_events`, and published to the configured AWS EventBridge bus
using a server-side SigV4 request. AWS credentials are never sent to the
browser.

Before enabling this in production, create the Ring Partner app, Alexa Smart
Home skill/account-linking settings, AWS EventBridge bus and IAM permission,
HTTPS callback URLs, and the Supabase migration. The app intentionally shows a
configuration error rather than inventing devices when required provider
settings are missing.

## Reference repositories and licensing

The implementation was informed by public repositories including:

- [Mental Model Drift](https://github.com/Marc-Dvci/Mental-Model-Drift)
- [Recall Guardian](https://github.com/RocoCroco/amazon-developer-hackathon)
- [Open Recall Format](https://github.com/RocoCroco/open-recall-format)
- [Alexa Memory MCP](https://github.com/Velu2k03/alexa-memory-mcp)
- [Context-Aware Personal Assistant](https://github.com/ASAYAMedia/amazon-alexa-mcp-hackathon)
- [Recall MCP](https://github.com/nittensharma16/recall-mcp)
- [KindHandoff](https://github.com/shi1720/Amazon-Developer-Hackathon)
- [Yasmin Voice Tutor](https://github.com/corepilotlabs/yasmin-voice-tutor-amazon-2026)
- [HomeKeeper](https://github.com/ritwikareddykancharla/homekeeper-alexa)
- [ChartKeep MCP](https://github.com/sherotree/chartkeep-mcp)
- [EchoFlow](https://github.com/Ayoola-tech2024/echoflow-alexa-mcp)
- [CareMesh MCP](https://github.com/Darlington6/caremesh-mcp)
- [Northbridge](https://github.com/dl88jing/northbridge-alexa-mcp)
- [Aawiz Voice Check-in](https://github.com/Aawizgroup/aawiz-voice-checkin)
- [Moot MCP](https://github.com/Nana-Kojo801/moot-mcp)
- [Hearthbeat](https://github.com/Thanatos9404/hearthbeat)
- [Still There](https://github.com/gtogbes/still-there)
- [Quiet Porch](https://github.com/m2ai-portfolio/quiet-porch)
- [ContextIQ GraphRAG](https://github.com/mitravinda462/ContextIQ-GraphRAG-Voice-Agent)
- [Bellwether](https://github.com/usv240/bellwether)
- [Ambient Guard](https://github.com/andywongpt-my/ambient-guard)
- [Mem0](https://github.com/mem0ai/mem0)
- [A-MEM](https://github.com/agiresearch/A-mem)
- [Letta](https://github.com/letta-ai/letta)
- [MemoryAgentBench](https://github.com/HUST-AI-HYZ/MemoryAgentBench)
- [Machine Dream](https://github.com/cgbarlow/machine-dream_AG)
- [Zenbrain](https://github.com/zensation-ai/zenbrain)
- [Amazon Bedrock samples](https://github.com/aws-samples/sample-amazon-bedrock-for-beginners)

Before redistributing copied code or assets, retain each upstream copyright and
license notice. MIT and Apache-2.0 projects have different notice/patent
requirements. Amazon, Alexa, Echo Show, Bedrock, Ring, and related marks remain
subject to their respective owners' terms. The links above are references,
not bundled dependencies.

## Roadmap

The next production steps are intentionally explicit:

1. Replace derived-on-read memory with versioned `memory_revisions` and an
   append-only consolidation ledger.
2. Add official MCP SDK conformance tests, `Mcp-Session-Id` lifecycle, SSE
   negotiation, OAuth 2.1/PKCE metadata, and narrow scopes.
3. Add a typed claim/evidence ledger with evidence hashes, source freshness,
   `INCONCLUSIVE`, and `SOURCE_UNAVAILABLE` outcomes.
4. Add an outbox for timezone-aware follow-ups, delivery receipts, retry-safe
   notifications, and explicit commitment state transitions.
5. Evaluate retrieval and conflict resolution with incremental
   MemoryAgentBench-style cases instead of relying only on demo fixtures.

## License

RecallOS application code is maintained in this repository under its existing
project terms. See the repository history and any included license files before
redistributing. Third-party packages and the reference projects retain their
own licenses.
