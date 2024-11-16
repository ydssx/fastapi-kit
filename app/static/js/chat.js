async function streamChat(prompt) {
    try {
        const response = await fetch('/api/v1/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'your-api-key'
            },
            body: JSON.stringify({
                prompt: prompt,
                stream: true
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const outputDiv = document.getElementById('output');

        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            const text = decoder.decode(value);
            outputDiv.innerHTML += text;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
