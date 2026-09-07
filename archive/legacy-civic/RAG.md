# Phase 5: historical RAG reports

This phase implements the RAG portion requested by the user: historical retrieval, cited reporting and an officer report viewer. It does not implement forwarding, solver assignment or the normal resolution workflow.

## Use

Sign in with an officer account, open **Historical reports** from the dashboard, choose an issue, and select **Prepare historical report**. The report is saved to Supabase. New source data produces a new version; unchanged data reuses the saved report. Old versions remain available.

The database currently needs actual submitted/imported issues and role accounts for a live showcase. Test fixtures are rolled back and are not pilot evidence.

## Retrieval

- The current issue and up to 20 directly linked/earlier family incidents come first.
- Up to five analogous verified cases use pgvector cosine similarity, the same category, the same embedding model and the same data provenance.
- Analogous cases are labelled separately and never increment recurrence counts.
- Each source includes observations, action notes, acceptance/rejection outcomes, evidence references, activity and assignment records.
- Retrieval uses the caller's session and officer role. Raw cross-issue bundles are officer-only, including through the direct database API.
- Private image links expire after 60 seconds. Storage paths are not sent to the model.

## Grounded generation

The system constructs dated, source-linked facts from retrieved records. OpenAI selects an extract of up to 16 fact IDs from a bounded list of up to 120 facts. The app validates every returned ID and renders the exact stored fact text. This is an **AI-prepared extract**, not freeform causal analysis.

No solver rankings, recommendations, confidence scores or inferred causes are generated. Citizen statements and intervention notes stay attributed as recorded claims.

Set server-only `OPENAI_API_KEY` and optionally `OPENAI_HISTORY_MODEL` (default `gpt-4.1-mini`). The API uses structured output, a 25-second timeout and no automatic retries. Provider storage is disabled for the request.

If the key is absent, the API fails/refuses, or output citations are invalid, the factual snapshot is saved with `generation_status=unavailable`. The page explicitly states that the AI summary is unavailable. A configured live OpenAI account is still required to verify real model access and output.

## Versions and limits

Saved versions include source snapshots, source issue IDs, preparation time, a content fingerprint, model and status. Application roles cannot update/delete versions. A unique issue/version constraint prevents concurrent writers from overwriting one another; the losing request receives a refresh message.

The snapshot includes up to 20 observations, actions and evidence entries per source, 20 events and 10 assignments. Report/action/evidence totals and truncation notices distinguish retrieved entries from total history. Missing history and missing evidence are explicit.

## Verification

- `npm run test:history`: source integrity, unsupported citations, prompt-like source content, empty history, model failure/refusal, no-key fallback, fingerprint changes and escaped HTML/citation anchors.
- `supabase/test_rag.sql`: rollback-only database integration test for retrieval, source separation, provenance/model/category filters, outcomes, empty history, version uniqueness and access control.
- `npm run lint` and `npm run build`.

Live authentication through the browser and a paid OpenAI call have not been verified with a user-provided account/key.

Implementation references: [Supabase RAG permissions](https://supabase.com/docs/guides/ai/rag-with-permissions) and [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
