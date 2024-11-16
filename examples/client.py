import requests

def chat_with_api(prompt: str):
    url = "http://localhost:8000/api/v1/chat"
    data = {
        "prompt": prompt,
        "model": "you"
    }
    
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json()["text"]
    else:
        raise Exception(f"API调用失败: {response.text}")

# 使用示例
if __name__ == "__main__":
    prompt = "What is Python?"
    try:
        response = chat_with_api(prompt)
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")
