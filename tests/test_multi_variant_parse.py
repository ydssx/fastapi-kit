"""Unit tests for multi-variant AI JSON parsing."""

from app.creator.prompts.multi_variant import parse_variants_json

VALID_JSON = """{
  "variants": [
    {"label": "角度A", "content": "草稿A"},
    {"label": "角度B", "content": "草稿B"},
    {"label": "角度C", "content": "草稿C"}
  ]
}"""

# LLM sometimes omits `{` before the 2nd/3rd objects.
MALFORMED_MISSING_BRACES = (
    '{"variants":[{"label":"职场新人视角","content":"草稿A\\n第二行"},'
    '"label":"效率达人结构","content":"草稿B"},'
    '"label":"轻松幽默语气","content":"草稿C"}]}'
)


def test_parse_variants_json_valid() -> None:
    variants = parse_variants_json(VALID_JSON)
    assert len(variants) == 3
    assert variants[0].label == "角度A"
    assert variants[0].content == "草稿A"
    assert variants[2].label == "角度C"


def test_parse_variants_json_repairs_missing_object_braces() -> None:
    variants = parse_variants_json(MALFORMED_MISSING_BRACES)
    assert len(variants) == 3
    assert variants[0].label == "职场新人视角"
    assert variants[0].content == "草稿A\n第二行"
    assert variants[1].label == "效率达人结构"
    assert variants[2].label == "轻松幽默语气"
    assert all(not v.content.strip().startswith("{") for v in variants)


def test_parse_variants_json_fenced_malformed() -> None:
    fenced = f"```json\n{MALFORMED_MISSING_BRACES}\n```"
    variants = parse_variants_json(fenced)
    assert len(variants) == 3
    assert variants[1].content == "草稿B"


def test_parse_variants_json_plain_text_fallback() -> None:
    variants = parse_variants_json("就是一段普通草稿")
    assert len(variants) == 1
    assert variants[0].label == "建议"
    assert variants[0].content == "就是一段普通草稿"
