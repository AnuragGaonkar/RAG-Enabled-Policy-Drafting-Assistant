import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from './App';

const departments = ['health', 'finance', 'education', 'environment', 'agriculture'];

export default function Chat() {
  const { token, logout } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState(departments[0]);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendQuery() {
    if (!query.trim()) return;

    setMessages([...messages, { sender: 'user', text: query }]);
    try {
      const { data } = await axios.post('http://localhost:5000/api/search', { query, department }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let results;
      try {
        results = JSON.parse(data.result);
      } catch {
        results = [{ snippet: data.result }];
      }

      if (Array.isArray(results) && results.length > 0) {
        // Group snippets by PDF title
        const pdfMap = new Map();
        results.forEach(r => {
          if (!pdfMap.has(r.title)) pdfMap.set(r.title, []);
          pdfMap.get(r.title).push(r.snippet);
        });

        // Compose a single message with all pdfs and snippets
        let reply = "";
        pdfMap.forEach((snippets, title) => {
          reply += `PDF: ${decodeURIComponent(title)}\n\n`;
          snippets.forEach((snippet, i) => {
            reply += `Snippet ${i + 1}: ${snippet}\n\n`;
          });
          reply += "\n";
        });

        setMessages(msgs => [...msgs, { sender: 'agent', text: reply.trim() }]);
      } else {
        setMessages(msgs => [...msgs, { sender: 'agent', text: "No results found for your query." }]);
      }
    } catch {
      setMessages(msgs => [...msgs, { sender: 'agent', text: 'Error occurred while searching.' }]);
    }

    setQuery(''); // Clear input box after sending
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#232a3c',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      margin: 0,
      padding: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 34px 20px 34px',
        background: '#22263d',
      }}>
        <div style={{ fontWeight: 700, fontSize: 28, color: '#d5def6', letterSpacing: 2 }}>
          Policy Assistant
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <select value={department} onChange={e => setDepartment(e.target.value)} style={{
            background: '#111930',
            color: '#b4bece',
            border: '1px solid #202a41',
            borderRadius: 7,
            padding: '7px 18px',
            fontSize: 17,
            cursor: 'pointer'
          }}>
            {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
          </select>
          <button onClick={logout} style={{
            background: '#272e3f',
            color: '#efefef',
            border: 'none',
            borderRadius: 7,
            padding: '7px 18px',
            fontSize: 17,
            cursor: 'pointer',
          }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{
        flexGrow: 1,
        padding: '24px 34px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div style={{
            color: '#5f6e89',
            textAlign: 'center',
            marginTop: 30,
            fontSize: 18
          }}>
            Start asking your policy questions!
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} style={{
            textAlign: m.sender === 'user' ? 'right' : 'left',
            margin: '24px 0',
          }}>
            <span style={{
              display: 'inline-block',
              padding: '16px 22px',
              borderRadius: 18,
              maxWidth: '90%',
              background: m.sender === 'user' ? 'linear-gradient(90deg,#b993fe,#2b3467)' : '#29304a',
              color: m.sender === 'user' ? '#fff' : '#c5ced9',
              fontSize: 18,
              boxShadow: '0 2px 8px rgba(120,130,200,0.13)',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              lineHeight: 1.6
            }}>
              {m.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        background: '#22263d',
        padding: '20px 34px',
        borderTop: '1px solid #2a334c',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}>
        <textarea
          placeholder="Ask your policy query..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            resize: 'none',
            height: 52,
            flex: 1,
            borderRadius: 9,
            border: '1px solid #263554',
            background: '#212b3a',
            color: '#b4bece',
            fontSize: 17,
            padding: '10px 16px',
            outline: 'none',
          }}
        />
        <button
          onClick={sendQuery}
          style={{
            background: 'linear-gradient(90deg,#b993fe,#2b3467)',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            fontWeight: 'bold',
            fontSize: 17,
            minWidth: 110,
            padding: '10px 0',
            cursor: 'pointer',
            boxShadow: '0 4px 18px 0 rgba(61,31,135,0.17)',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#9a63d8'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#b993fe'}
        >
          Send
        </button>
      </div>
    </div>
  );
}
