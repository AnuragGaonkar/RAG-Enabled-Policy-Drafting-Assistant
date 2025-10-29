import { type NextRequest, NextResponse } from 'next/server'
import { performRAG } from '@/lib/rag'

export async function POST(request: NextRequest) {
  try {
    const { query, department } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ message: 'Invalid query' }, { status: 400 })
    }

    console.log('[API/Search] Processing query:', query)

    // For very short queries, skip LLM entirely (instant response)
    if (query.length < 5) {
      console.log('[API/Search] Short query detected - instant response mode')
      const instantResponses: Record<string, string> = {
        'hi': 'Hello! How can I help you with healthcare policies today?',
        'hello': 'Hi there! I\'m here to help with policy drafting and questions.',
        'hey': 'Hey! What would you like to know about healthcare policies?',
      }
      
      const key = query.toLowerCase().trim()
      const message = instantResponses[key] || `Hello! What can I help you with?`
      
      return NextResponse.json({ message })
    }

    // For longer queries, use RAG with LLM
    const { answer, sources } = await performRAG(query, department || 'health')

    return NextResponse.json({
      message: answer,
      sources: sources.map((s) => ({
        title: (s as any).title,
        department: (s as any).department,
      })),
    })
  } catch (error) {
    console.error('[API/Search] Error:', error)
    
    return NextResponse.json(
      { message: 'Sorry, I encountered an error. Please try again.' },
      { status: 500 }
    )
  }
}
