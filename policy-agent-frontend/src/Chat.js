import React, { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { AuthContext } from "./App";

const departments = ["health", "finance", "education", "environment", "agriculture"];

const policyFields = [
  { name: "policyName", label: "Policy Name", type: "text", required: true },
  { name: "policyNumber", label: "Policy Number", type: "text", required: true },
  { name: "issuer", label: "Issuer", type: "text", required: true },
  { name: "type", label: "Type", type: "text", required: true },
  { name: "validFrom", label: "Valid From", type: "date", required: true },
  { name: "validTo", label: "Valid To", type: "date", required: true },
  { name: "description", label: "Description", type: "textarea", required: true },
  { name: "department", label: "Department", type: "select", options: departments, required: true },
];

export default function Chat() {
  const { token, logout } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(departments[0]);
  const [messages, setMessages] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [mode, setMode] = useState("");
  const [form, setForm] = useState({});
  const [policyId, setPolicyId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formTouched, setFormTouched] = useState({});
  const [uploadStatus, setUploadStatus] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [buttonState, setButtonState] = useState("hidden");
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [conflictChecked, setConflictChecked] = useState(false);
  const [conflictExists, setConflictExists] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleFileChange(e) {
    setUploadFile(e.target.files[0] || null);
    setUploadStatus("");
    setButtonState("hidden");
    setSuggestions([]);
    setConflictChecked(false);
    setConflictExists(false);
  }

  function handleModeChange(e) {
    const v = e.target.value;
    setMode(v);
    setUploadStatus("");
    setButtonState("hidden");
    setSuggestions([]);
    setConflictChecked(false);
    setConflictExists(false);
    if (v === "create") {
      setShowForm(true);
      setForm({});
      setFormTouched({});
      setPolicyId("");
    } else if (v === "update") {
      setShowForm(false);
      setForm({});
      setPolicyId("");
    } else {
      setShowForm(false);
      setForm({});
      setPolicyId("");
    }
  }

  function handleFormInput(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormTouched({ ...formTouched, [e.target.name]: true });
    setConflictChecked(false);
    setConflictExists(false);
  }

  function isFormCompleted() {
    return policyFields.every(
      (f) => (f.required ? form[f.name] && form[f.name].toString().trim() : true)
    );
  }

  function canCheckConflict() {
    if (loading) return false;
    if (mode === "create") return isFormCompleted();
    if (mode === "update") return policyId.trim() !== "";
    return false;
  }

  function canSave() {
    if (loading) return false;
    return conflictChecked && !conflictExists;
  }

  async function checkConflict() {
    if (!canCheckConflict()) return;
    setLoading(true);
    setUploadStatus("");
    setSuggestions([]);
    try {
      const fd = new FormData();
      if (uploadFile) fd.append("file", uploadFile);
      fd.append("mode", mode);
      if (mode === "update") fd.append("policyId", policyId);
      if (mode === "create") {
        policyFields.forEach((f) => fd.append(f.name, form[f.name] || ""));
      }
      const res = await axios.post("http://localhost:5000/api/check-policy-conflict", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConflictChecked(true);
      if (res.data.conflict) {
        setUploadStatus("Conflict: " + res.data.message);
        setButtonState("suggest");
        setConflictExists(true);
      } else {
        setUploadStatus("No conflicts detected. Ready to save.");
        setButtonState("apply");
        setConflictExists(false);
      }
    } catch {
      setUploadStatus("Conflict check failed.");
      setConflictChecked(false);
      setButtonState("hidden");
    }
    setLoading(false);
  }

  async function suggestChanges() {
    if (!uploadFile) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await axios.post("http://localhost:5000/api/suggest-policy-edits", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestions(res.data.suggestions || []);
      setButtonState("apply");
      setUploadStatus("Suggestions ready. Review and save.");
    } catch {
      setUploadStatus("Failed to generate suggestions.");
    }
    setLoading(false);
  }

  async function savePolicy() {
    if (!canSave()) return;
    setLoading(true);
    setUploadStatus("");
    try {
      const fd = new FormData();
      if (uploadFile) fd.append("file", uploadFile);
      fd.append("mode", mode);
      if (mode === "update") fd.append("policyId", policyId);
      if (mode === "create") {
        policyFields.forEach((f) => fd.append(f.name, form[f.name] || ""));
      }
      const res = await axios.post("http://localhost:5000/api/upload-policy", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200 && !res.data.conflict) {
        setUploadStatus(res.data.message || "Policy saved.");
        setButtonState("hidden");
        setUploadFile(null);
        setForm({});
        setMode("");
        setPolicyId("");
        setShowForm(false);
        setSuggestions([]);
        setFormTouched({});
        setConflictChecked(false);
        setConflictExists(false);
      } else {
        setUploadStatus("Conflict: " + res.data.message);
        setButtonState("suggest");
        setConflictExists(true);
      }
    } catch {
      setUploadStatus("Failed to save policy.");
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!query.trim() || loading) return;
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setQuery("");
    setLoading(true);
    setBotTyping(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/search",
        { query, department },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let parsedResults;
      try {
        parsedResults = JSON.parse(res.data.result);
      } catch {
        parsedResults = [{ snippet: res.data.result }];
      }

      if (Array.isArray(parsedResults) && parsedResults.length > 0) {
        const grouped = new Map();
        parsedResults.forEach((r) => {
          if (!grouped.has(r.title)) grouped.set(r.title, []);
          grouped.get(r.title).push(r.snippet);
        });
        let answer = "";
        grouped.forEach((snips, title) => {
          answer += `**${decodeURIComponent(title)}**\n\n`;
          snips.forEach((s) => (answer += `- ${s}\n`));
          answer += "\n";
        });
        setMessages((prev) => [...prev, { sender: "agent", text: answer }]);
      } else {
        setMessages((prev) => [...prev, { sender: "agent", text: "No results found." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { sender: "agent", text: "Failed to fetch answer." }]);
    }
    setLoading(false);
    setBotTyping(false);
  }

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      sendMessage();
    }
  };

  function renderAvatar(sender) {
    if (sender === "user")
      return (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(90deg,#b993fe,#2b3467)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
            fontSize: 19,
            border: "2px solid #ddd",
          }}
        >
          U
        </div>
      );
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(90deg,#6d8cff 60%,#b993fe 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #26149",
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <rect x={4} y={7} width={16} height={10} rx={6} fill="#fff"></rect>
          <circle cx={8} cy={12} r={1.4} fill="#b993fe"></circle>
          <circle cx={16} cy={12} r={1.4} fill="#b993fe"></circle>
          <rect x={10.5} y={5.5} width={3} height={3} rx={1.5} fill="#6c8cff"></rect>
        </svg>
      </div>
    );
  }

  function TypingBubble() {
    return (
      <div style={{ display: "flex", alignItems: "center", margin: "18px 0" }}>
        {renderAvatar("agent")}
        <div
          style={{
            background: "linear-gradient(90deg,#636df6 70%,#aa9cfc 100%)",
            color: "#fff",
            padding: 14,
            borderRadius: 18,
            minHeight: 36,
            width: 80,
          }}
        >
          <DotAnimation />
        </div>
      </div>
    );
  }

  function DotAnimation() {
    return (
      <>
        <span className="typing-dot" style={{ fontSize: 28, margin: "0 3px", animation: "ip 1.2s ease-in-out infinite" }}>●</span>
        <span className="typing-dot" style={{ fontSize: 28, margin: "0 3px", animation: "ip 1.2s ease-in-out 0.25s infinite" }}>●</span>
        <span className="typing-dot" style={{ fontSize: 28, margin: "0 3px", animation: "ip 1.2s ease-in-out 0.5s infinite" }}>●</span>
        <style>{`
          @keyframes ip {
            0%, 100% { opacity: 1; transform: translateY(0); }
            50% { opacity: 0.3; transform: translateY(-10px); }
          }
          .typing-dot {
            color: #d3cef5;
          }
        `}</style>
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#1a1e2a",
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        color: "#d1d5db",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 36px",
          backgroundColor: "#222538",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#d1d5db",
        }}
      >
        <h1 style={{ margin: 0 }}>Policy Assistant</h1>
        <div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{
              marginRight: 16,
              backgroundColor: "#1e2237",
              color: "#d1d5db",
              borderRadius: 6,
              border: "none",
              padding: "6px 12px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {departments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
          <button
            onClick={logout}
            style={{
              borderRadius: 6,
              padding: "8px 14px",
              backgroundColor: "#ef4444",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 20,
          padding: 20,
          overflow: "hidden",
        }}
      >
        {/* Upload + Form panel */}
        <div
          style={{
            flexBasis: 420,
            backgroundColor: "#222538",
            borderRadius: 12,
            padding: 20,
            color: "#cbd5e1",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h2>Upload and Policy Actions</h2>
          <input
            type="file"
            onChange={handleFileChange}
            style={{ marginBottom: 12 }}
          />
          <select
            value={mode}
            onChange={handleModeChange}
            style={{
              padding: 8,
              fontSize: 16,
              borderRadius: 8,
              border: "none",
              backgroundColor: "#1e2237",
              color: "#cbd5e1",
              fontWeight: 600,
            }}
          >
            <option value="">Select Action</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
          </select>

          {mode === "create" && showForm && (
            <form
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 8,
              }}
              onSubmit={(e) => e.preventDefault()}
            >
              {policyFields.map((f) => (
                <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontWeight: 600, color: "#cbd5e1" }}>
                    {f.label}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.name}
                      value={form[f.name] || ""}
                      onChange={handleFormInput}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        border: "none",
                        fontSize: 16,
                        backgroundColor: "#1e2237",
                        color: "#cbd5e1",
                        fontFamily: "inherit",
                        resize: "vertical",
                        minHeight: 80,
                        outline: "none",
                      }}
                    />
                  ) : f.type === "select" ? (
                    <select
                      name={f.name}
                      value={form[f.name] || ""}
                      onChange={handleFormInput}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        border: "none",
                        fontSize: 16,
                        backgroundColor: "#1e2237",
                        color: "#cbd5e1",
                        fontFamily: "inherit",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">-- Select Department --</option>
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={f.name}
                      type={f.type}
                      value={form[f.name] || ""}
                      onChange={handleFormInput}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        border: "none",
                        fontSize: 16,
                        backgroundColor: "#1e2237",
                        color: "#cbd5e1",
                        fontFamily: "inherit",
                        outline: "none",
                      }}
                    />
                  )}
                  {formTouched[f.name] && (!form[f.name] || !form[f.name].toString().trim()) && (
                    <span style={{ color: "#f87171", fontSize: 13 }}>Required</span>
                  )}
                </div>
              ))}
            </form>
          )}

          {mode === "update" && (
            <input
              type="text"
              placeholder="Policy ID"
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              style={{
                padding: 10,
                fontSize: 16,
                borderRadius: 8,
                border: "none",
                backgroundColor: "#1e2237",
                color: "#cbd5e1",
                fontWeight: "600",
                outline: "none",
                marginTop: 10,
              }}
            />
          )}

          <div style={{ display: "flex", gap: 16 }}>
            <button
              disabled={
                loading ||
                (mode === "create" && !isFormCompleted()) ||
                (mode === "update" && !policyId.trim())
              }
              onClick={checkConflict}
              style={{
                flex: 1,
                backgroundColor:
                  loading ||
                  (mode === "create" && !isFormCompleted()) ||
                  (mode === "update" && !policyId.trim())
                    ? "#555"
                    : "#6366f1",
                borderRadius: 8,
                color: "white",
                fontWeight: "bold",
                fontSize: 16,
                border: "none",
                padding: "12px 0",
                cursor:
                  loading ||
                  (mode === "create" && !isFormCompleted()) ||
                  (mode === "update" && !policyId.trim())
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  (mode === "create" && !isFormCompleted()) || (mode === "update" && !policyId.trim())
                    ? 0.6
                    : 1,
              }}
            >
              Check Conflict
            </button>

            <button
              disabled={loading || buttonState !== "apply"}
              onClick={() => {
                if (buttonState === "suggest") suggestChanges();
                else if (buttonState === "apply") savePolicy();
              }}
              style={{
                flex: 1,
                backgroundColor: buttonState === "apply" ? "#22c55e" : "#555",
                borderRadius: 8,
                color: "white",
                fontWeight: "bold",
                fontSize: 16,
                border: "none",
                padding: "12px 0",
                cursor: loading || buttonState !== "apply" ? "not-allowed" : "pointer",
                opacity: loading || buttonState !== "apply" ? 0.6 : 1,
              }}
            >
              {buttonState === "suggest" ? "Suggest Changes" : "Save"}
            </button>
          </div>

          {uploadStatus && (
            <div style={{ marginTop: 16, color: "#fbbf24", fontWeight: "600" }}>{uploadStatus}</div>
          )}

          {suggestions.length > 0 && (
            <div
              style={{
                marginTop: 12,
                maxHeight: 140,
                overflowY: "auto",
                background: "#1e2237",
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
                color: "#cbd5e1",
              }}
            >
              <strong>Suggestions:</strong>
              <ul style={{ marginTop: 8 }}>
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#222538",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 20,
              color: "#e0e7ff",
              fontSize: 16,
            }}
          >
            {messages.length === 0 && !botTyping && (
              <div style={{ textAlign: "center", marginTop: 40, color: "#777", fontSize: 18 }}>
                Start chatting...
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: m.sender === "user" ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                {m.sender === "agent" && renderAvatar("agent")}
                <div
                  style={{
                    background: m.sender === "user" ? "#5b4fbb" : "#272a3d",
                    padding: "12px 18px",
                    borderRadius: 12,
                    maxWidth: "75%",
                    color: "#e0e7ff",
                    fontSize: 16,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.sender === "agent" ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
                </div>
                {m.sender === "user" && renderAvatar("user")}
              </div>
            ))}

            {botTyping && <TypingBubble />}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: 16,
              background: "#1c1f2f",
              borderRadius: "0 0 12px 12px",
            }}
          >
            <textarea
              placeholder="Type your question here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              rows={3}
              style={{
                width: "100%",
                borderRadius: 12,
                resize: "none",
                padding: 14,
                fontSize: 16,
                background: "#272a49",
                border: "none",
                color: "#e0e7ff",
                fontWeight: "bold",
              }}
            />
            <button
              disabled={loading || !query.trim()}
              onClick={sendMessage}
              style={{
                marginTop: 16,
                width: "100%",
                background: loading ? "#9393a6" : "linear-gradient(90deg,#7c3aed,#bb86fc)",
                borderRadius: 12,
                padding: 14,
                color: "white",
                fontWeight: "bold",
                fontSize: 16,
                outline: "none",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
