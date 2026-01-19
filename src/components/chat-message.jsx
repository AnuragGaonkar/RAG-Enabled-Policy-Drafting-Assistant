import React from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function ChatMessage({ message }) {
  const isUser = message.role === "user"

  const formatTime = (date) => {
    if (!date) return ""
    const d = new Date(date)
    const hours = d.getHours()
    const minutes = d.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const formattedHours = hours % 12 || 12
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    return `${formattedHours}:${formattedMinutes} ${ampm}`
  }

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">MH</AvatarFallback>
        </Avatar>
      )}
      <Card
        className={`max-w-md lg:max-w-2xl p-4 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {/* MARKDOWN RENDERER START */}
        <div className="text-sm leading-relaxed prose dark:prose-invert max-w-none break-words">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Style specific markdown elements to match your theme
              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({children}) => <li className="pl-1">{children}</li>,
              strong: ({children}) => <span className="font-bold text-foreground/90">{children}</span>,
              h1: ({children}) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
              h2: ({children}) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
              h3: ({children}) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
              blockquote: ({children}) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-2">{children}</blockquote>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {/* MARKDOWN RENDERER END */}

        <p className={`text-[10px] mt-2 ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {formatTime(message.timestamp)}
        </p>
      </Card>
      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">U</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}