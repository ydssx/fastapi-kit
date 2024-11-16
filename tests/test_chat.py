from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chat_endpoint():
    response = client.post(
        "/api/v1/chat",
        json={"prompt": "Hello", "model": "you"}
    )
    assert response.status_code == 200
    assert "text" in response.json()
