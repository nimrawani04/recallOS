# RecallOS

**RecallOS is an evidence-grounded memory operating system for voice and conversational AI.** It converts conversational streams into structured, verifiable memories, tracks how decisions and deadlines evolve over time, surfaces unresolved blockers, and exposes these facts through a protected Model Context Protocol (MCP) server and an interactive visual simulator.

Unlike traditional memory layers that rely on unstructured vector similarity, RecallOS enforces strict quote provenance: every memory is anchored to exact source quotes, changes are tracked through temporal supersession, and uncertainty is surfaced explicitly rather than hallucinating resolution.

---

## Key Features

- **Exact Quote Grounding & Provenance**: Every extracted memory must link to a verbatim substring from the source transcript. The agent can always answer _why_ it believes a fact and cite the exact passage, speaker, and timestamp.
- **Temporal Supersession & Drift Detection**: When plans or deadlines change (e.g., a deadline moved from Friday to Sunday), RecallOS tracks the supersession without erasing historical context. It actively monitors mental-model divergence and team alignment drift.
- **Explicit Uncertainty & Calibration**: Claims are categorized into _confirmed_, _inferred_, _conflict_, and _unresolved_. Absence of evidence is never mistaken for proof that an event did not happen.
- **Ambient Guard Privacy Filter**: Automatically scans inputs before extraction to redact API keys, credentials, credit card numbers, phone numbers, email addresses, and ambient background chatter.
- **Owner-Scoped Multi-Tenant Isolation**: Data is scoped to authenticated users with Row Level Security (RLS) in Supabase. MCP endpoints enforce bearer token authentication so users can access only their private vault.
- **Facts-First Analytics**: Graphs, counts, commitments, and metrics are computed deterministically before presentation, ensuring clients explain verified facts rather than inventing statistics.
- **Voice-Ready JSON-RPC Contract**: Every MCP tool response provides a structured voice envelope (`spoken`, `grounded`, `nextStep`, `data`) optimized for voice assistants and ambient displays like Echo Show.
- **Full Vault Lifecycle & Safety Controls**: Users can export their entire memory vault, preview deletions, or remove records with idempotency keys and cryptographic confirmation receipts.

---

## Feature Map

| Route / Surface | Capability                                                                                                        |
| :-------------- | :---------------------------------------------------------------------------------------------------------------- |
| `/`             | **Daily Briefing**: Risk-ranked overview of blockers, overdue commitments, unanswered questions, and plan changes |
| `/ask`          | **Evidence Search**: Natural language query interface returning verified memories and source citations            |
| `/import`       | **Transcript Ingestion**: Conversation import with real-time Ambient Guard redaction and AI entity extraction     |
| `/commitments`  | **Commitment Ledger**: Tracks promises, tasks, and deadlines with explicit ownership and certainty weights        |
| `/graph`        | **Temporal GraphRAG**: Visual knowledge graph showing entity dependencies and timeline filtering                  |
| `/drift`        | **Drift Risk Radar**: Visualizes cognitive divergence, drift velocity, and predictive milestone slippage          |
| `/insights`     | **Facts Analytics**: Deterministic breakdown of memory types, certainty health, and source channels               |
| `/consolidate`  | **Memory Synthesis**: Offline consolidation pipeline resolving temporal conflicts and merging entities            |
| `/alexa`        | **Alexa+ Simulator**: Echo Show-style interface with real-time MCP tool inspection, voice input, and TTS          |
| `/devices`      | **Smart Home Bridge**: Account linking for Alexa Smart Home, Ring Partner API, and AWS EventBridge                |
| `POST /api/mcp` | **MCP Server**: Protected JSON-RPC endpoint implementing tools, resources, prompts, and bounded agent turns       |

---

## MCP Server (`/api/mcp`)

RecallOS implements a Model Context Protocol (MCP) server designed for integration with AI assistants, IDEs, and ambient voice agents.

### Tools

#### Query & Reasoning

- `recall_get_context`: Returns owner-scoped summary of active memories, evidence coverage, unresolved items, and next actions.
- `recall_get_briefing`: Fetches prioritized briefing items filtered by severity (`blocker`, `overdue`, `followup`, `change`).
- `recall_query_memories`: Semantic and keyword memory search grounded in exact supporting quotes.
- `recall_check_commitments`: Audits commitments by person with firm vs. tentative distinction.
- `recall_detect_drift`: Surfaces plan divergence, supersessions, and unverified assumptions.
- `recall_suggest_chart`: Generates deterministic facts-checked chart specifications (`kind`, `status`, `channel`).
- `recall_consolidate`: Consolidates episodic records into unified entity nodes.
- `recall_export_handoff`: Compiles executive project handoffs with zero ungrounded claims.
- `recall_schedule_followup`: Generates proactive reminder triggers for overdue promises.
- `recall_get_core_memory_blocks`: Returns tiered core memory blocks for long-term agent context.
- `recall_agent_turn`: Multi-tool autonomous agent turn bounded to four evidence-verified tool calls.

#### Privacy & Lifecycle

- `recall_get_privacy_summary`: Returns active audit scopes and data boundary guarantees.
- `recall_export_my_data`: Exports all user memories, citations, and imports as portable JSON.
- `recall_preview_delete_import`: Previews records affected prior to deletion.
- `recall_delete_import`: Deletes a specific import and its associated memories (requires confirmation and request ID).
- `recall_delete_my_data`: Wipes all owner records with cryptographic audit receipts.

### Resources & Prompts

- **Resources**: `recall://context`, `recall://memories`, `recall://schema`
- **Prompts**: `recall_weekly_review`, `recall_prepare_handoff`, `recall_explain_drift`

### Voice Response Contract

All tool calls return a standardized envelope alongside structured domain data:

```json
{
  "ok": true,
  "spoken": "RecallOS returned an evidence-backed result.",
  "grounded": true,
  "nextStep": "Review the supporting evidence before relying on it.",
  "data": { ... }
}
```

---

## Architecture

```text
       Conversational Transcript / Voice Input
                         │
                         ▼
             [ Ambient Guard Redactor ]
             (API keys, PII, ambient noise)
                         │
                         ▼
        [ Structured Extraction & Evidence Validator ]
             (Exact quote substring matching)
                         │
                         ▼
             [ Supabase Storage & RLS ]
        (conversation_imports · memories · drift)
                         │
                         ▼
              [ Shared Memory Engine ]
        (Temporal supersession · Calibration)
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
     [ Web UI ]    [ /api/mcp ]   [ Alexa+ Sim ]
     (10 Pages)    (JSON-RPC MCP) (Echo Show UX)
```

---

## Alexa, Ring & Smart Home Integration

RecallOS includes server-side connectors for smart home ecosystems:

```text
Alexa Smart Home Account Linking
              │
              ▼
    RecallOS Owner Account ── Ring Appstore Linking ── Ring Partner API
              │                                                │
              └──────── Normalized Device Records ─────────────┘
                                       │
                                       ▼
                       Ring HMAC Webhook ──► AWS EventBridge (SigV4)
```

- **Ring Appstore-First Linking**: Uses authorization code exchange with signed nonces; tokens are encrypted server-side with AES-256-GCM before storage.
- **Alexa Smart Home Skill**: Supports OAuth 2.0 authorization endpoints, delivering short-lived opaque access tokens for endpoint discovery and control.
- **AWS EventBridge Relay**: Ingests Ring webhooks validated via HMAC-SHA256 and relays them to Amazon EventBridge using server-side AWS SigV4 signing.

---

## Getting Started

### Prerequisites

- **Node.js**: 20.19+
- **Package Manager**: pnpm, npm, or bun

### Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/nimrawani04/recallOS.git
   cd recallOS
   ```

2. **Install dependencies**:

   ```sh
   pnpm install
   # or: npm install
   ```

3. **Configure environment variables**:

   ```sh
   cp .env.example .env
   ```

   Configure the following required variables:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   _(Optional)_ To configure Ring and Alexa integrations, provide the corresponding keys in `.env` as documented in `.env.example`.

4. **Apply database migrations**:
   Run migrations against your Supabase database:
   - `drizzle/migrations/0000_recallos_private_imports.sql`
   - `drizzle/migrations/0001_memory_operations.sql`
   - `drizzle/migrations/0002_provider_connections.sql`
   - `drizzle/migrations/0003_memory_baseline.sql`

5. **Start development server**:
   ```sh
   pnpm dev
   # or: npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Quality Checks & Testing

```sh
# Run Vitest test suite
pnpm test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint
pnpm lint
```

---

## Demo Walkthrough

1. **Daily Briefing (`/`)**: View prioritized blockers and overdue promises ranked by risk to milestones.
2. **Import & Redact (`/import`)**: Paste a conversation transcript, click **Preview Redaction** to view Ambient Guard filtering, and extract evidence-backed memories.
3. **Drift Radar (`/drift`)**: Inspect deadline shifts (e.g. Friday 6pm supersession to Sunday noon) and cognitive divergence metrics.
4. **GraphRAG (`/graph`)**: Explore entity dependency networks filtered by timeline day.
5. **Insights (`/insights`)**: Review deterministic facts-first charts categorized by memory kind, status, and communication channel.
6. **Alexa+ Simulator (`/alexa`)**: Test voice prompts and inspect live JSON-RPC tool calls against `/api/mcp`.

---

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.
