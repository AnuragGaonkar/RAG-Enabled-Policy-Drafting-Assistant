import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Sparkles, ShieldCheck, FileText, Search, Zap, Trash2, AlertCircle } from "lucide-react"
import { ChatMessage } from "./chat-message"

export function ChatInterface() {
  // 1. CHANGE: Initialize state from Local Storage
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("policy_chat_history");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 2. CHANGE: Save to Local Storage whenever messages change
  useEffect(() => {
    localStorage.setItem("policy_chat_history", JSON.stringify(messages));
  }, [messages]);

  // 3. NEW FUNCTION: Clear Chat History
  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
        setMessages([]);
        localStorage.removeItem("policy_chat_history");
    }
  };

  const handleSendMessage = async (e, overrideInput) => {
    if (e) e.preventDefault()
    const textToSend = overrideInput || input
    if (!textToSend.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend })
      });

      if (!response.ok) throw new Error("Failed to connect to AI Agent");

      const data = await response.json();

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "I couldn't generate a response.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

    } catch (err) {
      console.error(err)
      setError("Server connection failed. Is the backend running?")
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = [
    { icon: ShieldCheck, label: "Check Compliance", query: "Check if our data retention policy complies with GDPR." },
    { icon: FileText, label: "Draft Clause", query: "Draft a confidentiality clause for a remote work agreement." },
    { icon: Search, label: "Find Policy", query: "Where can I find the guidelines for maternity leave?" },
    { icon: Zap, label: "Summarize", query: "Summarize the key points of the 2024 Cybersecurity Act." },
  ]

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Floating Clear Button (Visible when there are messages) */}
      {messages.length > 0 && (
          <div className="absolute top-4 right-6 z-30">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear Chat History"
              >
                  <Trash2 size={18} />
              </Button>
          </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
            
            {/* EMPTY STATE */}
            {messages.length === 0 && (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Sparkles size={32} />
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground">
                            Good Morning, Anurag
                        </h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            I'm your Policy Assistant. I can help you draft, review, and ensure compliance for your documents.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                        {suggestions.map((item, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSendMessage(null, item.query)}
                                className="flex items-center gap-3 p-4 bg-card hover:bg-muted/50 border border-border rounded-xl text-left transition-all hover:shadow-md hover:-translate-y-0.5 group"
                            >
                                <div className="p-2 bg-muted group-hover:bg-background rounded-lg text-muted-foreground group-hover:text-primary transition-colors">
                                    <item.icon size={20} />
                                </div>
                                <span className="text-sm font-medium text-card-foreground">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* MESSAGE LIST */}
            <div className="space-y-6 pb-4 pt-10"> {/* Added pt-10 to avoid overlapping with clear button */}
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}
                
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-3 items-center">
                            <Sparkles size={16} className="text-primary animate-spin-slow" />
                            <span className="text-sm text-muted-foreground font-medium">Processing request...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center">
                        <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-background/80 backdrop-blur-md border-t border-border z-20">
        <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => handleSendMessage(e)} className="relative group">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about policies..."
                    disabled={isLoading}
                    className="flex-1 py-7 pl-6 pr-14 rounded-2xl shadow-sm border-muted-foreground/20 focus-visible:ring-primary text-base transition-all group-hover:border-primary/50"
                />
                <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl w-10 h-10 aspect-square shadow-sm transition-transform active:scale-95"
                >
                    <Send size={18} />
                </Button>
            </form>
            <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-70">
                AI assistance may require human verification for critical legal documents.
            </p>
        </div>
      </div>
    </div>
  )
}