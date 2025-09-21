import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { AuthContext } from './App';

const departments = ['health', 'finance', 'education', 'environment', 'agriculture'];

export default function Chat() {
  const { token, logout } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState(departments[0]);
  const [messages, setMessages] = useState([]);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('create');
  const [policyId, setPolicyId] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const [conflictFound, setConflictFound] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [buttonState, setButtonState] = useState('check');  // 'check', 'suggest', 'apply'

  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages or loading changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function highlightQuery(text, query) {
    // Optional: add highlighting logic for query terms, currently no-op.
    return text;
  }

  // Chat functionality unchanged from your original code
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      sendQuery();
    }
  };

  async function sendQuery() {
    if (!query.trim() || loading) return;
    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setQuery('');
    setLoading(true);

    try {
      const { data } = await axios.post(
        'http://localhost:5000/api/search',
        { query, department },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let results;
      try {
        results = JSON.parse(data.result);
      } catch {
        results = [{ snippet: data.result }];
      }

      if (Array.isArray(results) && results.length > 0) {
        const pdfResultsMap = new Map();
        results.forEach((r) => {
          if (!pdfResultsMap.has(r.title))
            pdfResultsMap.set(r.title, []);
          pdfResultsMap.get(r.title).push(r.snippet);
        });

        let reply = '';
        pdfResultsMap.forEach((snippets, title) => {
          reply += `**${decodeURIComponent(title)}**\n\n`;
          snippets.forEach((snippet, idx) => {
            reply += `- ${snippet}\n`;
          });
          reply += '\n';
        });

        setMessages((m) => [...m, { sender: 'agent', text: reply.trim() }]);
      } else {
        setMessages((m) => [...m, { sender: 'agent', text: 'No results found.' }]);
      }
    } catch {
      setMessages((m) => [...m, { sender: 'agent', text: 'Error occurred while processing the query.' }]);
    }
    setLoading(false);
  }

  const renderAvatar = (sender) => {
    if (sender === 'user') {
      return (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(90deg,#b993fe,#2b3467)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#fff',
            fontSize: 19,
            border: '2px solid #ddd',
          }}
        >
          U
        </div>
      );
    }

    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(90deg,#6d8cff 60%,#b993fe 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #261f49',
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <rect x={4} y={7} width={16} height={10} rx={6} fill="#fff" />
          <circle cx={8} cy={12} r={1.4} fill="#b993fe" />
          <circle cx={16} cy={12} r={1.4} fill="#b993fe" />
          <rect x={10.5} y={5.5} width={3} height={3} rx={1.5} fill="#6d8cff" />
        </svg>
      </div>
    );
  };

  const TypingBubble = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', margin: '18px 0' }}>
      {renderAvatar('agent')}
      <div
        style={{
          background: 'linear-gradient(90deg,#6366f 70%,#b993fe 100%)',
          color: 'white',
          padding: '16px 30px',
          borderRadius: 18,
          marginLeft: 12,
          minHeight: 36,
          fontSize: 18,
          letterSpacing: 1,
          minWidth: 72,
          boxShadow: '0 2px 16px rgba(88,99,141,0.14)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <DotAnimation />
      </div>
    </div>
  );

  const DotAnimation = () => (
    <>
      <span className="typing-dot" style={{ animationDelay: '0s', fontSize: 32, margin: '0 2px' }}>
        •
      </span>
      <span className="typing-dot" style={{ animationDelay: '0.2s', fontSize: 32, margin: '0 2px' }}>
        •
      </span>
      <span className="typing-dot" style={{ animationDelay: '0.4s', fontSize: 32, margin: '0 2px' }}>
        •
      </span>
      <style>{`
        .typing-dot {
          opacity: 0.6;
          animation: blink 1.1s infinite;
        }
        @keyframes blink {
          0%, 80%, 100% {
            opacity: 0.2;
          }
          40% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );

  // --------------------
  // Upload workflow handlers
  // --------------------

  const handleUploadFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    // Reset states related to upload flow:
    setConflictFound(false);
    setSuggestions([]);
    setButtonState('check');
    setUploadMessage('');
  };

  async function handleCheckConflict() {
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }
    if (uploadMode === 'update' && !policyId.trim()) {
      alert('Please enter Policy ID');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('mode', uploadMode);
    if (uploadMode === 'update') formData.append('policyId', policyId);

    try {
      const response = await axios.post('/api/check-policy-conflict', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.conflict) {
        setConflictFound(true);
        setUploadMessage(`Conflict: ${response.data.message}`);
        setButtonState('suggest');
      } else {
        setConflictFound(false);
        setUploadMessage('No conflicts. Ready to save.');
        setButtonState('apply');
      }
    } catch (e) {
      setUploadMessage('Conflict check failed.');
      console.error(e);
    }

    setLoading(false);
  }

  async function handleSuggestChanges() {
    if (!uploadFile) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axios.post('/api/suggest-policy-edits', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuggestions(response.data.suggestions || []);
      setButtonState('apply');
      setUploadMessage('Suggestions ready. Apply changes or save.');
    } catch (e) {
      setUploadMessage('Suggestion generation failed.');
      console.error(e);
    }

    setLoading(false);
  }

  async function handleApplySave() {
    if (!uploadFile) {
      alert('Select file before saving.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('mode', uploadMode);
    if (uploadMode === 'update') formData.append('policyId', policyId);

    try {
      const response = await axios.post('/api/upload-policy', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        if (response.data.conflict) {
          setConflictFound(true);
          setUploadMessage(`Conflict: ${response.data.message}`);
          setButtonState('suggest');
        } else {
          setConflictFound(false);
          setUploadMessage(response.data.message || 'Policy saved!');
          setButtonState('check');
          setSuggestions([]);
          setUploadFile(null);
          setPolicyId('');
        }
      }
    } catch (e) {
      if (e.response && e.response.status === 409) {
        setConflictFound(true);
        setUploadMessage(`Conflict: ${e.response.data.message}`);
        setButtonState('suggest');
      } else {
        setUploadMessage('Save failed.');
      }
      console.error(e);
    }

    setLoading(false);
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#232a', fontFamily: 'Segoe UI, Arial, sans-serif', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      {/* Your existing header, chat UI, and input box remain identical */}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1f2937',
        padding: '14px 20px',
        borderRadius: 12,
        boxShadow: '0 4px 15px rgba(88,99,141,0.17)',
        margin: '18px auto 0 auto',
        maxWidth: 790,
        width: '96%',
      }}>
        <label htmlFor="file-upload" style={{
          backgroundColor: '#4f46e5',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 15,
        }}>
          <svg width={16} height={16} style={{ marginBottom: -2, marginRight: 4 }} fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 21V3M6 10l6-7 6 7M4 16h16" /></svg>
          Choose File
          <input id="file-upload" type="file" style={{ display: 'none' }} onChange={handleUploadFileChange} />
        </label>

        <span style={{ color: '#cbd', fontSize: 15, flexGrow: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {uploadFile ? uploadFile.name : 'No file chosen'}
        </span>

        <select value={uploadMode} onChange={e => setUploadMode(e.target.value)} style={{
          backgroundColor: '#374151',
          border: 'none',
          color: '#db',
          padding: '10px 14px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
        }}>
          <option value="create">Create</option>
          <option value="update">Update</option>
        </select>

        {uploadMode === 'update' && (
          <input
            style={{ marginLeft: 8, width: 170, padding: 10, borderRadius: 8, border: 'none', backgroundColor: '#374151', color: '#db', fontWeight: 600, fontSize: 15 }}
            placeholder="Policy ID"
            type="text"
            value={policyId}
            onChange={e => setPolicyId(e.target.value)}
          />
        )}

        <button
          disabled={loading}
          style={{
            marginLeft: 10,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#4f46e5',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 10px #4f46e5',
          }}
          onClick={handleCheckConflict}
        >
          Check Conflict
        </button>

        <button
          disabled={loading || (buttonState === 'suggest' && suggestions.length === 0) || conflictFound}
          style={{
            marginLeft: 10,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: buttonState === 'suggest' ? '#f59e0b' : '#22c55e',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: buttonState === 'suggest' ? '0 0 10px #f59e0b' : '0 0 10px #22c55e',
          }}
          onClick={() => {
            if (buttonState === 'suggest') handleSuggestChanges();
            else if (buttonState === 'apply') handleApplySave();
          }}
        >
          {buttonState === 'suggest' ? 'Suggest Changes' : 'Save'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div
          style={{
            maxWidth: 790,
            margin: '12px auto',
            padding: 12,
            backgroundColor: '#1e293b',
            borderRadius: 8,
            maxHeight: 160,
            overflowY: 'auto',
            color: '#fff',
            fontSize: 14,
          }}
        >
          <strong>Suggestions:</strong>
          <ul>
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Insert your complete original chat message display and input box UI here */}

      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px 34px', maxHeight: 'calc(100vh - 250px)' }}>
        {messages.length === 0 ? (
          <div style={{ color: '#5f617d', textAlign: 'center', marginTop: 15, fontSize: 20 }}>Start chatting...</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16, alignItems: 'flex-start' }}>
              {msg.sender !== 'user' && (
                <div style={{ marginRight: 12 }}>
                  {renderAvatar('agent')}
                </div>
              )}
              <div style={{ maxWidth: '70%', background: msg.sender === 'user' ? 'linear-gradient(90deg,#b993fe,#2b3467)' : 'linear-gradient(99deg,#6366f 70%,#b993fe 100%)', padding: 12, borderRadius: 12, color: msg.sender === 'user' ? '#fff' : '#ddd', fontSize: 16 }}>
                {msg.sender === 'agent' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
              </div>
              {msg.sender === 'user' && (
                <div style={{ marginLeft: 12 }}>
                  {renderAvatar('user')}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          display: 'flex',
          padding: '12px 34px',
          borderTop: '1px solid #3c3f52',
          backgroundColor: '#1e202d',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <textarea
          rows={2}
          style={{
            flexGrow: 1,
            borderRadius: 12,
            border: 'none',
            padding: 12,
            fontSize: 16,
            resize: 'none',
            outline: 'none',
            backgroundColor: '#2b2e43',
            color: '#ddd',
          }}
          placeholder="Ask your query here..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
        />
        <button
          onClick={sendQuery}
          disabled={loading || !query.trim()}
          style={{
            backgroundColor: '#4f46e5',
            color: '#fff',
            borderRadius: 12,
            border: 'none',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 10px #4f46e5',
          }}
        >
          {loading ? <DotAnimation /> : 'Send'}
        </button>
      </div>
    </div>
  );
}
