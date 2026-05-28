import json

import pytest
from pydantic import ValidationError

from app.core.config import Settings, _DEFAULT_JWT_SECRET


def test_reject_default_jwt_secret_in_production() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(environment="prod", jwt_secret=_DEFAULT_JWT_SECRET)


def test_parse_cors_origins_from_json_string() -> None:
    origins = Settings(cors_origins=json.dumps(["https://a.example", "https://b.example"]))
    assert origins.cors_origins == ["https://a.example", "https://b.example"]


def test_parse_cors_origins_from_list() -> None:
    origins = Settings(cors_origins=["http://localhost:3000"])
    assert origins.cors_origins == ["http://localhost:3000"]
