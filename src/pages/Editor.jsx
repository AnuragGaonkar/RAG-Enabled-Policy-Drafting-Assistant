import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, FileCog, MessagesSquare, Download, Save, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PolicyActionsPanel } from '@/components/policy-actions-panel';
import ReactMarkdown from "react-markdown"; // Ensure this is installed

// --- Internal Components ---
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
    { role: 'assistant', content: 'I am the Drafting Agent. Tell me what policy you need (e.g., "Draft a Data Privacy Policy for a hospital").' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [documentContent, setDocumentContent] = useState("# New Policy Document\n\nGenerated content will appear here...");

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        // CALL THE NEW PIPELINE
        const response = await fetch('/api/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: input })
        });

        const data = await response.json();
        const aiMsg = { role: 'assistant', content: "I have drafted the policy based on legal requirements. Check the editor panel on the right." };
        
        setMessages(prev => [...prev, aiMsg]);
        setDocumentContent(data.response); // Update the Editor Canvas directly

    } catch (error) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to drafting engine." }]);
    } finally {
        setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[400px] flex flex-col border-r border-border bg-card">
        <div className="flex border-b border-border">
            <button 
                onClick={() => setActiveTab('actions')}
                className={cn("flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2", activeTab === 'actions' ? "text-primary border-b-2 border-primary bg-muted/50" : "text-muted-foreground hover:bg-muted/50")}
            >
                <FileCog size={16} /> Actions
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={cn("flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2", activeTab === 'chat' ? "text-primary border-b-2 border-primary bg-muted/50" : "text-muted-foreground hover:bg-muted/50")}
            >
                <MessagesSquare size={16} /> AI Drafter
            </button>
        </div>

        {activeTab === 'actions' && <PolicyActionsPanel />}

        {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m, i) => <ChatMessage key={i} {...m} />)}
                    {isTyping && <div className="text-xs text-muted-foreground ml-12 animate-pulse">Drafting...</div>}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-border bg-card">
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Describe the policy you need..."
                            className="flex-1 px-3 py-2 bg-muted rounded-md text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button onClick={handleSend} className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* RIGHT PANEL: Editor Canvas */}
      <div className="flex-1 flex flex-col h-full bg-muted/30">
        <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-muted-foreground" />
              <span className="font-semibold text-sm">Policy Draft Preview</span>
            </div>
            <div className="flex gap-2">
               <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-muted">
                <Download size={14} /> Export
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90">
                <Save size={14} /> Save
              </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            <div className="w-[816px] min-h-[1056px] bg-card shadow-xl border border-border p-12 mb-8 prose dark:prose-invert max-w-none">
               <ReactMarkdown>{documentContent}</ReactMarkdown>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;