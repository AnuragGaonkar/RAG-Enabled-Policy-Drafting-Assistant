import { spawn } from 'child_process'

interface LLMConfig {
  modelPath: string
  llamaCppPath: string
  contextSize?: number
  temperature?: number
  maxTokens?: number
}

const LLM_CONFIG: LLMConfig = {
  modelPath: process.env.LLM_MODEL_PATH || 'C:/llama-cpu/gemma-3-4b-it-q4_0.gguf',
  llamaCppPath: process.env.LLAMA_CPP_PATH || 'C:/llama-cpu/llama-cli.exe',
  contextSize: 2048,
  temperature: 0.7,
  maxTokens: 256,
}

// Utility to sanitize prompt and remove any null/control characters
function safePrompt(input: string): string {
  // Removes null bytes and non-printable ASCII (except for whitespace/newline/tab)
  return input.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export async function runLLM(
  prompt: string,
  config?: Partial<LLMConfig>
): Promise<string> {
  const finalConfig = { ...LLM_CONFIG, ...config }
  const safePromptStr = safePrompt(prompt)

  return new Promise((resolve, reject) => {
    const args = [
      '-m',
      finalConfig.modelPath,
      '-p',
      safePromptStr,
      '-n',
      String(finalConfig.maxTokens),
      '-c',
      String(finalConfig.contextSize),
      '--temp',
      String(finalConfig.temperature),
      '--no-display-prompt',
    ]

    console.log('[LLM] Starting llama.cpp process...')

    const llamaProcess = spawn(finalConfig.llamaCppPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    })

    let output = ''
    let hasReceivedOutput = false
    let isResolved = false

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        llamaProcess.kill()
        reject(new Error('LLM timeout'))
      }
    }, 100000)

    llamaProcess.stdout.on('data', (data) => {
      hasReceivedOutput = true
      output += data.toString()
    })

    llamaProcess.stderr.on('data', (data) => {
      const errorStr = data.toString()
      if (
        !errorStr.includes('llama_') &&
        !errorStr.includes('load:') &&
        !errorStr.includes('print_info')
      ) {
        console.log('[LLM] Info:', errorStr.substring(0, 80))
      }
    })

    llamaProcess.on('close', (code) => {
      clearTimeout(timeout)

      if (isResolved) return
      isResolved = true

      if (code !== 0 && code !== null && !hasReceivedOutput) {
        reject(new Error('LLM error'))
      } else {
        const cleanedOutput = output
          .split('\n')
          .filter((line) => !line.startsWith('llama_') && line.trim() !== '')
          .join('\n')
          .trim()

        // Remove any trailing ">" or markdown remnants
        const finalOutput = cleanedOutput.replace(/[>\n\s]+$/, '')

        if (finalOutput.length === 0) {
          resolve('I could not generate a response.')
        } else {
          console.log('[LLM] Response ready')
          resolve(finalOutput)
        }
      }
    })

    llamaProcess.on('error', (error) => {
      clearTimeout(timeout)
      if (!isResolved) {
        isResolved = true
        reject(new Error('LLM failed to start'))
      }
    })
  })
}

export function buildRAGPrompt(query: string, context: string): string {
  return `You are a helpful Policy Assistant for the Ministry of Healthcare in India.

${context ? `Policy Context (summarize key points from these documents concisely):\n${context}\n` : ''}

User Question: ${query}

Instructions:
- Provide a concise summary answer no longer than 200 tokens.
- If you use information from the provided documents, explicitly cite the document titles.
- Use clear and professional language.
- If no relevant information is found in the documents, answer based on your general knowledge.

Answer:
`
}

// >>> Modification here for deeper, real conflict analysis:
export function buildConflictCheckPrompt(
  newPolicy: string,
  existingPolicies: string[]
): string {
  return `You are a senior policy analyst specializing in healthcare.

Your task is to compare the NEW POLICY text given below to the list of EXISTING POLICIES.

Focus your analysis ONLY on real, substantive content conflicts or contradictions—NOT on metadata, dates, similar wording, format, or technical document info. 

Look for and highlight any:
- Logical contradictions or disagreements in the actual instructions, prohibitions, requirements, or rules
- Overlaps (where both say the same thing, so duplicative policy is created)
- Gaps (where the new policy says less or is missing a critical aspect handled in the old one)
- Obsolete provisions (if the new contradicts or makes the old unnecessary)
- Real-world issues in applying BOTH at the same time (e.g., two policies "mandate" opposite things)

Ignore differences in:
- Dates
- Formatting, author, version, number/id, font, style
- Phrasing if policies mean the same things in context

Be concise, specific, and cite source excerpts if needed.

NEW POLICY:
${newPolicy}

EXISTING POLICIES:
${existingPolicies.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}

Format your answer as follows:
CONFLICTS: [YES/NO]
CONFLICTS_FOUND: [clear, REAL policy-level conflicts]
SUGGESTIONS: [short, clear ways to resolve conflicts or merge, only if needed]
`
}

export function parseConflictCheckResponse(response: string): {
  hasConflict: boolean
  conflicts: string[]
  suggestions: string[]
} {
  const lines = response.split('\n').filter((l) => l.trim())

  const hasConflict =
    lines.some((l) => l.includes('CONFLICTS:') && l.includes('YES')) ||
    lines.some((l) => l.toLowerCase().includes('conflict'))

  const conflicts: string[] = []
  const suggestions: string[] = []

  let inConflictsSection = false
  let inSuggestionsSection = false

  for (const line of lines) {
    if (line.includes('CONFLICTS_FOUND:')) {
      inConflictsSection = true
      inSuggestionsSection = false
      const content = line.split('CONFLICTS_FOUND:')[1]?.trim()
      if (content && content !== 'None') conflicts.push(content)
    } else if (line.includes('SUGGESTIONS:')) {
      inSuggestionsSection = true
      inConflictsSection = false
      const content = line.split('SUGGESTIONS:')[1]?.trim()
      if (content) suggestions.push(content)
    } else if (inConflictsSection && line.match(/^\d+\.|^-|^•/)) {
      conflicts.push(line.replace(/^\d+\.|^-|^•/, '').trim())
    } else if (inSuggestionsSection && line.match(/^\d+\.|^-|^•/)) {
      suggestions.push(line.replace(/^\d+\.|^-|^•/, '').trim())
    }
  }

  return {
    hasConflict,
    conflicts: conflicts.length > 0 ? conflicts : ['Potential conflict detected'],
    suggestions:
      suggestions.length > 0 ? suggestions : ['Review policy scope'],
  }
}
