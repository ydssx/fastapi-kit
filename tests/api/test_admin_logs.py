import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.repositories.user import UserRepository


async def _register(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "securepass123"},
    )
    assert response.status_code == 201
    return response.json()["data"]["tokens"]["access_token"]


async def _make_admin(db_engine, email: str) -> None:
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email)
        assert user is not None
        await repo.promote_to_admin(user)
        await session.commit()


@pytest.mark.asyncio
async def test_logs_unavailable_without_loki(client: AsyncClient, db_engine) -> None:
    admin_email = "logs-admin@example.com"
    token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    response = await client.get(
        "/api/v1/admin/logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 503
    assert response.json()["code"] == 50301


@pytest.mark.asyncio
async def test_logs_query_with_mock_loki(
    client: AsyncClient,
    db_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.admin_logs import AdminLogsService

    monkeypatch.setattr(AdminLogsService, "_require_loki", lambda self: "http://loki:3100")

    admin_email = "logs-query@example.com"
    token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    loki_payload = {
        "status": "success",
        "data": {
            "result": [
                {
                    "stream": {"job": "fastapi"},
                    "values": [
                        [
                            "1700000000000000000",
                            '{"level":"info","event":"request_completed","request_id":"abc-123"}',
                        ]
                    ],
                }
            ]
        },
    }

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return loki_payload

    class FakeClient:
        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get(self, url: str, params: dict) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setattr("app.services.admin_logs.httpx.AsyncClient", lambda **kwargs: FakeClient())

    response = await client.get(
        "/api/v1/admin/logs?request_id=abc-123",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] >= 1
    assert data["items"][0]["request_id"] == "abc-123"


@pytest.mark.asyncio
async def test_logs_pagination_second_page(
    client: AsyncClient,
    db_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.admin_logs import AdminLogsService

    monkeypatch.setattr(AdminLogsService, "_require_loki", lambda self: "http://loki:3100")

    admin_email = "logs-page2@example.com"
    token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    values = [
        [
            str(1_700_000_000_000_000_000 - i * 1_000_000),
            f'{{"level":"info","event":"event-{i}","request_id":"req-{i}"}}',
        ]
        for i in range(55)
    ]

    loki_payload = {
        "status": "success",
        "data": {
            "result": [
                {
                    "stream": {"job": "fastapi"},
                    "values": values,
                }
            ]
        },
    }

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return loki_payload

    class FakeClient:
        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get(self, url: str, params: dict) -> FakeResponse:
            assert params["limit"] == 500
            return FakeResponse()

    monkeypatch.setattr("app.services.admin_logs.httpx.AsyncClient", lambda **kwargs: FakeClient())

    response = await client.get(
        "/api/v1/admin/logs?page=2&page_size=50",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 55
    assert data["page"] == 2
    assert len(data["items"]) == 5
    assert data["items"][0]["message"] == "event-50"
