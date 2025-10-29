import { getPoliciesCollection } from './mongodb'
import { runLLM, buildRAGPrompt } from './llm'
import type { PolicyDocument } from './types'

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2) // discard short words
}

export async function searchPolicies(
  query: string,
  department?: string,
  limit: number = 5
): Promise<PolicyDocument[]> {
  try {
    const collection = await getPoliciesCollection()

    // Tokenize query words for regex searching
    const tokens = tokenize(query)
    if (tokens.length === 0) return []

    // Build regex for each token, then $or as query on content/title/description
    const regexes = tokens.map((t) => new RegExp(t, 'i'))
    const orClauses = regexes.flatMap((r) => [
      { content: r },
      { title: r },
      { description: r },
    ])

    const searchQuery: any = { $or: orClauses }
    if (department) searchQuery.department = department

    const policies = await collection.find(searchQuery).limit(limit).toArray()
    console.log(`[RAG] Found ${policies.length} docs matching query tokens`)

    return policies as unknown as PolicyDocument[]
  } catch (error) {
    console.error('[RAG] Error searching policies:', error)
    return []
  }
}

export async function performRAG(
  query: string,
  department?: string
): Promise<{ answer: string; sources: PolicyDocument[] }> {
  console.log('[RAG] Processing query:', query)

  const relevantDocs = await searchPolicies(query, department)

  // Prepare context with doc titles + short content
  const context = relevantDocs.length
    ? relevantDocs
        .map(
          (doc, idx) =>
            `${idx + 1}. Title: ${doc.title || 'Policy Document'}\nContent: ${
              (doc.content || '').substring(0, 300)
            }`
        )
        .join('\n\n')
    : ''

  // Use the improved prompt that asks LLM to be concise and mention docs
  const prompt = buildRAGPrompt(query, context)

  const answer = await runLLM(prompt, {
    maxTokens: 200, // limit response length for conciseness
  })

  return { answer, sources: relevantDocs }
}
