import React, { useState } from 'react';
import { marked } from 'marked';

function App() {
  const [messages, setMessages] = useState([{ sender: 'Hannah', text: 'Hi! How can I help you today?' }]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const userMessage = { sender: 'user', text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');

    try {
      const response = await fetch('http://localhost:5050/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      const data = await response.json();
      const botMessage = { sender: 'Hannah', text: data.reply };
      setMessages([...updatedMessages, botMessage]);
    } catch (error) {
      console.error('Failed to fetch:', error);
      const errorMessage = { sender: 'Hannah', text: 'Sorry, something went wrong!' };
      setMessages([...updatedMessages, errorMessage]);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-log">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.sender === 'Hannah' ? (
            <div className="markdown-response">
              <strong>Hannah</strong>
              <div
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
              />
            </div>
          ) : (
            <p>{msg.text}</p>
          )}

          </div>
        ))}
      </div>
      <div className="chat-input">
          <input value={input} onChange={e => setInput(e.target.value)} />
          <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
