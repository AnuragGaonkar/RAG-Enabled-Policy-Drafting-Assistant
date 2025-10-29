import { type NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getPoliciesCollection } from '@/lib/mongodb'
import { runLLM, buildConflictCheckPrompt, parseConflictCheckResponse } from '@/lib/llm'
import type { PolicyFormData, PolicyDocument } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataStr = formData.get('metadata') as string
    const policyId = formData.get('policyId') as string

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('[API/Conflict] Processing conflict check')

    // Parse file content
    const fileContent = await file.text()

    // Build new policy description
    let newPolicyDescription = ''
    let searchCriteria: any = {}

    if (metadataStr) {
      // CREATE MODE
      const metadata: PolicyFormData = JSON.parse(metadataStr)
      newPolicyDescription = `Policy Name: ${metadata.policyName}
Policy Number: ${metadata.policyNumber}
Issuer: ${metadata.issuer}
Type: ${metadata.type}
Valid From: ${metadata.validFrom}
Valid To: ${metadata.validTo}
Department: ${metadata.department}
Description: ${metadata.description}

File Content (excerpt):
${fileContent.substring(0, 2000)}`

      // Search for similar policies in MongoDB
      searchCriteria = {
        department: metadata.department,
        $or: [
          { policyNumber: metadata.policyNumber },
          { title: new RegExp(metadata.policyName, 'i') },
        ],
      }
    } else if (policyId) {
      // UPDATE MODE
      newPolicyDescription = `Policy ID: ${policyId}
Updated File Content (excerpt):
${fileContent.substring(0, 2000)}`

      // Build search criteria - try both ObjectId and policyNumber
      searchCriteria = { policyNumber: policyId }
      
      if (ObjectId.isValid(policyId)) {
        searchCriteria = {
          $or: [
            { policyNumber: policyId },
            { _id: new ObjectId(policyId) }
          ]
        }
      }
    }

    // Query MongoDB for potentially conflicting policies
    const collection = await getPoliciesCollection()
    const existingPolicies = await collection
      .find(searchCriteria)
      .limit(5)
      .toArray() as unknown as PolicyDocument[]

    console.log(`[API/Conflict] Found ${existingPolicies.length} potentially related policies`)

    // If no existing policies found, no conflict
    if (existingPolicies.length === 0) {
      return NextResponse.json({
        hasConflict: false,
        message: 'No conflicts detected. Policy is ready to save.',
      })
    }

    // Build context for LLM
    const existingPoliciesContext = existingPolicies.map(
      (p) => `Title: ${p.title}
${p.policyNumber ? `Policy Number: ${p.policyNumber}` : ''}
Department: ${p.department}
${p.description ? `Description: ${p.description}` : ''}
Content (excerpt): ${p.content.substring(0, 500)}...`
    )

    // Generate conflict check prompt
    const prompt = buildConflictCheckPrompt(
      newPolicyDescription,
      existingPoliciesContext
    )

    // Run LLM for conflict analysis
    console.log('[API/Conflict] Running LLM conflict analysis')
    const llmResponse = await runLLM(prompt, { maxTokens: 1500 })

    // Parse LLM response
    const { hasConflict, conflicts, suggestions } =
      parseConflictCheckResponse(llmResponse)

    console.log(`[API/Conflict] Analysis complete. Conflict: ${hasConflict}`)

    if (hasConflict) {
      return NextResponse.json({
        hasConflict: true,
        conflicts,
        suggestions,
        message: 'Conflicts detected. Please review suggestions before saving.',
      })
    }

    return NextResponse.json({
      hasConflict: false,
      message: 'No conflicts detected. Policy is ready to save.',
    })
  } catch (error) {
    console.error('[API/Conflict] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check conflicts',
      },
      { status: 500 }
    )
  }
}
