"""
Tokenizer Adapter Registry

Provides a single function to instantiate all available adapters.
Single Responsibility: adapter discovery and registration.

Design decisions:
- Registry is a function (not a class) — there's no state to manage.
- Adapters are instantiated fresh on each call; they cache internally.
- New adapters are added here — this is the ONLY place the system
  needs to change when a new tokenizer is introduced (Open/Closed via registry).
"""

from app.services.tokenizers.base import TokenizerAdapter
from app.services.tokenizers.tiktoken_adapter import TikTokenAdapter
from app.services.tokenizers.sentencepiece_adapter import SentencePieceAdapter
from app.services.tokenizers.claude_adapter import ClaudeEstimateAdapter
from app.services.tokenizers.huggingface_adapter import HuggingFaceGPT2Adapter


def get_all_adapters() -> list[TokenizerAdapter]:
    """Return instances of every registered tokenizer adapter."""
    return [
        TikTokenAdapter(),
        SentencePieceAdapter(),
        ClaudeEstimateAdapter(),
        HuggingFaceGPT2Adapter(),
    ]


def get_adapter_by_name(name: str) -> TokenizerAdapter | None:
    """Look up a single adapter by its unique name. Returns None if not found."""
    for adapter in get_all_adapters():
        if adapter.name == name:
            return adapter
    return None


def get_adapter_names() -> list[str]:
    """Return the list of all registered adapter names."""
    return [a.name for a in get_all_adapters()]
