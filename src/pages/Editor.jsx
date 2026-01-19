import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, FileCog, MessagesSquare, Download, Save, FileText, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PolicyActionsPanel } from '@/components/policy-actions-panel';
import ReactMarkdown from "react-markdown";

// --- Chat Component ---
const ChatMessage = ({ role, content }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "flex gap-3 mb-4",
      role === 'user' ? "flex-row-reverse" : "flex-row"
    )}
  >
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
      role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    )}>
      {role === 'user' ? <User size={16} /> : <Bot size={16} />}
    </div>
    
    <div className={cn(
      "max-w-[85%] p-3 rounded-lg text-sm leading-relaxed shadow-sm border prose dark:prose-invert",
      role === 'user' 
        ? "bg-primary text-primary-foreground border-primary rounded-tr-none" 
        : "bg-card text-card-foreground border-border rounded-tl-none"
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  </motion.div>
);

const Editor = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am the Drafting Agent. Tell me what policy you need (e.g., "Draft a policy for clinical establishment registration in India").' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [documentContent, setDocumentContent] = useState("# New Policy Document\n\nGenerated content will appear here...");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle, saving, saved, error

  // --- BUTTON LOGIC ---

  // 1. Export Logic (Download as .md file)
  const handleExport = () => {
    if (!documentContent) return;
    const element = document.createElement("a");
    const file = new Blob([documentContent], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `policy_draft_${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 2. Save Logic (To MongoDB via /save-draft)
  const handleSave = async () => {
    setSaveStatus("saving");
    try {
        const response = await fetch('http://127.0.0.1:5000/save-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: documentContent, 
                filename: "Policy_Draft_" + new Date().toISOString() 
            })
        });
        
        if (response.ok) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 3000);
        } else {
            setSaveStatus("error");
        }
    } catch (e) {
        console.error("Save failed", e);
        setSaveStatus("error");
    }
  };

  // --- CHAT & DRAFTING LOGIC ---
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
        // Send request to the Drafting route
        const response = await fetch('http://127.0.0.1:5000/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: currentInput })
        });

        const data = await response.json();
        
        if (data.response) {
            const aiMsg = { 
                role: 'assistant', 
                content: "I have drafted the policy based on legal requirements. You can see the full text in the preview panel on the right." 
            };
            setMessages(prev => [...prev, aiMsg]);
            
            // INJECT THE GENERATED TEXT INTO THE EDITOR
            setDocumentContent(data.response); 
        } else {
            throw new Error("Empty response from AI");
        }

    } catch (error) {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Error: Could not connect to the drafting engine. Please ensure the backend is running." 
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      
      {/* LEFT SIDEBAR (Width: 400px) */}
      <div className="w-[400px] flex flex-col border-r border-border bg-card">
        <div className="flex border-b border-border">
            <button 
                onClick={() => setActiveTab('actions')}
                className={cn("flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all", activeTab === 'actions' ? "text-primary border-b-2 border-primary bg-muted/50" : "text-muted-foreground hover:bg-muted/50")}
            >
                <FileCog size={16} /> Actions
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={cn("flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all", activeTab === 'chat' ? "text-primary border-b-2 border-primary bg-muted/50" : "text-muted-foreground hover:bg-muted/50")}
            >
                <MessagesSquare size={16} /> AI Drafter
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            {activeTab === 'actions' ? (
                <PolicyActionsPanel />
            ) : (
                <div className="flex flex-col h-full">
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.map((m, i) => <ChatMessage key={i} {...m} />)}
                        {isTyping && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-12 animate-pulse">
                                <Bot size={14} /> Drafting policy...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="p-4 border-t border-border bg-card">
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Describe the policy you need..."
                                className="flex-1 px-3 py-2 bg-muted rounded-md text-sm outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary/20"
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={isTyping || !input.trim()}
                                className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* RIGHT PANEL: Editor Canvas */}
      <div className="flex-1 flex flex-col h-full bg-muted/30">
        <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span className="font-semibold text-sm">Policy Draft Preview</span>
            </div>
            
            <div className="flex gap-2">
               <button 
                 onClick={handleExport}
                 className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
               >
                <Download size={14} /> Export (.md)
              </button>
              
              <button 
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-foreground rounded-md transition-all shadow-sm",
                    saveStatus === 'saved' ? "bg-emerald-600 hover:bg-emerald-700" : 
                    saveStatus === 'error' ? "bg-destructive hover:bg-destructive/90" : 
                    "bg-primary hover:bg-primary/90"
                )}
              >
                {saveStatus === 'saving' && <span className="animate-spin text-sm">↻</span>}
                {saveStatus === 'saved' && <Check size={14} />}
                {saveStatus === 'error' && <AlertCircle size={14} />}
                {saveStatus === 'idle' && <Save size={14} />}
                
                {saveStatus === 'saved' ? "Saved to Mongo!" : 
                 saveStatus === 'error' ? "Error Saving" : "Save to DB"}
              </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            {/* The white page representation */}
            <div className="w-[816px] min-h-[1056px] bg-card shadow-xl border border-border p-12 mb-8 prose dark:prose-invert max-w-none transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
               <ReactMarkdown>{documentContent}</ReactMarkdown>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;