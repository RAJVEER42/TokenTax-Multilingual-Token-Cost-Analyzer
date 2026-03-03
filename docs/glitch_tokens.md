# Glitch Tokens — Educational Reference

> **TokenTax v0.7.0 · Phase 7 — Glitch Token Detection**

## What Are Glitch Tokens?

Glitch tokens are vocabulary entries in byte-pair encoding (BPE) and unigram
tokenizers that exhibit anomalous behaviour when processed by large language
models (LLMs). They are a well-documented artefact of the tokenizer training
process, not a security vulnerability.

### Root Cause

BPE tokenizers are trained on large text corpora. Tokens that were merged
during training but are *rarely or never encountered during model
pre-training* end up with poorly-calibrated embedding vectors. When a prompt
contains such a token, the model's prediction pipeline receives an input
that lies far outside its training distribution, leading to pathological
outputs.

### Observed Effects

| Effect | Description |
|---|---|
| **Repetition loops** | The model repeats a phrase or token indefinitely. |
| **Evasion / refusal** | The model refuses to acknowledge the token's existence or changes subject. |
| **Hallucination** | The model generates plausible-sounding but factually wrong text about the token. |
| **Garbled output** | The model produces syntactically invalid or incoherent text. |
| **Premature termination** | Special control tokens (e.g. `<|endoftext|>`) truncate generation. |

Not every glitch token triggers all effects. Severity varies across model
versions, temperature settings, and prompt context.

## Severity Classification

TokenTax assigns a **danger level** to each known glitch token. These are
*educational labels*, not security ratings.

| Level | Meaning | Example |
|---|---|---|
| **HIGH** | Reproducible pathological behaviour across multiple models and prompt variations. | `SolidGoldMagikarp`, `TheNitromeFan` |
| **MEDIUM** | Known edge-case effects; may cause issues in specific configurations. | `<\|endoftext\|>`, `cloneembedreportprint` |
| **LOW** | Minor anomaly; slightly elevated perplexity but no severe pathology. | `attRot`, `<unk>` |

## Detection Methodology

TokenTax detects glitch tokens through the following pipeline:

1. **Encoding** — Text is tokenized by each adapter (tiktoken, SentencePiece,
   HuggingFace GPT-2, etc.) as part of the normal analysis flow.
2. **ID extraction** — Adapters that support `encode_to_ids()` expose the raw
   token ID sequence. Heuristic-based adapters (e.g. Claude estimator) do not
   produce real token IDs and are skipped.
3. **O(n) scanning** — The token ID sequence is scanned in a single pass
   against a per-tokenizer registry of known glitch IDs. Each ID is checked
   against a `frozenset` for O(1) lookup.
4. **Position tracking** — Every occurrence of a glitch token records its
   0-based index in the sequence, enabling precise UI highlighting.
5. **No re-encoding** — Glitch detection reuses the same token IDs produced
   during normal tokenization. This guarantees <5% overhead.

### Version-Aware Registries

Each glitch registry is keyed by `(tokenizer_name, version_prefix)`. If the
installed tokenizer version does not match any known registry, detection is
silently skipped. This prevents false positives when vocabulary mappings
change across major library versions.

## Per-Tokenizer Registries

### tiktoken (cl100k_base) — GPT-4 / GPT-3.5-turbo

| Token ID | Text | Danger | Reference |
|---|---|---|---|
| 188700 | ` SolidGoldMagikarp` | HIGH | [Rumbelow & Sollazo 2023](https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation) |
| 203075 | ` TheNitromeFan` | HIGH | [Rumbelow & Sollazo 2023](https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation) |
| 151645 | ` cloneembedreportprint` | MEDIUM | [Rumbelow & Sollazo 2023](https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation) |
| 100257 | `<\|endoftext\|>` | MEDIUM | [tiktoken repo](https://github.com/openai/tiktoken) |
| 177879 | ` attRot` | LOW | [Land & Bartolo 2024](https://arxiv.org/abs/2405.05417) |

### HuggingFace GPT-2

| Token ID | Text | Danger | Reference |
|---|---|---|---|
| 50256 | `<\|endoftext\|>` | MEDIUM | [HuggingFace GPT-2](https://huggingface.co/gpt2) |
| 30898 | ` NewGuid` | LOW | [Land & Bartolo 2024](https://arxiv.org/abs/2405.05417) |

### SentencePiece (XLM-RoBERTa)

| Token ID | Text | Danger | Reference |
|---|---|---|---|
| 3 | `<unk>` | LOW | [SentencePiece repo](https://github.com/google/sentencepiece) |

## Important Caveats

### Detection ≠ Vulnerability

Glitch tokens are **not** security vulnerabilities, prompt injection vectors,
or jailbreak techniques. They are a natural consequence of vocabulary
construction in subword tokenizers. Their detection in TokenTax serves an
**educational** purpose: helping researchers and developers understand
tokenizer behaviour.

### Model-Dependent Effects

The effects listed above were observed in specific model versions at specific
inference configurations. Newer model versions may have mitigated some or all
of these effects through:

- Embedding regularization
- Training data filtering
- Post-training alignment (RLHF / DPO)
- Inference-time guardrails

### Registry Completeness

The glitch token registries in TokenTax are **not exhaustive**. They include
well-documented, academically-cited examples. The full set of anomalous
tokens in any tokenizer vocabulary may be significantly larger.

## Academic References

1. **Rumbelow, J. & Sollazo, M.** (2023). "SolidGoldMagikarp (plus, prompt
   generation)." *LessWrong*.
   https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation

2. **Land, S. & Bartolo, M.** (2024). "Fishing for Magikarp: Automatically
   Detecting Under-Trained Tokens in Large Language Models." *arXiv preprint*
   arXiv:2405.05417. https://arxiv.org/abs/2405.05417

3. **OpenAI.** tiktoken — BPE tokenizer for OpenAI models.
   https://github.com/openai/tiktoken

4. **Kudo, T. & Richardson, J.** (2018). "SentencePiece: A simple and
   language independent subword tokenizer and detokenizer for Neural Text
   Processing." *EMNLP 2018*. https://github.com/google/sentencepiece

## Extending the Registry

To add new glitch tokens:

1. Add a `GlitchRegistryEntry` to the appropriate tuple in
   `apps/api/app/services/glitch_token_service.py`.
2. Add the new entry to the corresponding per-tokenizer table above.
3. Write a test in `apps/api/tests/test_glitch_tokens.py` verifying
   detection and position accuracy.
4. Cite the academic source in the `reference` field.
5. Assign a danger level based on the severity criteria above.

**Do not** add entries without an academic or reproducible citation.
Anecdotal reports should be tracked in GitHub Issues, not the registry.

---

*Last updated: 2026-03-03 · TokenTax v0.7.0 · Phase 7*
