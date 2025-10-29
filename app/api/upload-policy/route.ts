import { type NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getPoliciesCollection } from '@/lib/mongodb'
import type { PolicyFormData, PolicyDocument } from '@/lib/types'
const pdfParse = require('pdf-parse')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataStr = formData.get('metadata') as string
    const policyId = formData.get('policyId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    // ----- PDF & Text Extraction -----
    let fileContent = ""
    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Use pdf-parse for text extraction from PDFs
        const arrayBuffer = await file.arrayBuffer()
        const pdfData = await pdfParse(Buffer.from(arrayBuffer))
        fileContent = pdfData.text
      } else {
        // For .txt/.docx, browser will supply plain text
        fileContent = await file.text()
      }
    } catch {
      fileContent = ""
    }

    const collection = await getPoliciesCollection()

    if (metadataStr) {
      // CREATE MODE
      const metadata: PolicyFormData = JSON.parse(metadataStr)
      // Check for duplicate
      const existing = await collection.findOne({
        policyNumber: metadata.policyNumber,
      })
      if (existing) {
        return NextResponse.json({
          success: false,
          message: `Policy ${metadata.policyNumber} already exists. Use update instead.`,
        })
      }
      const newPolicy: Omit<PolicyDocument, '_id'> = {
        title: metadata.policyName,
        content: fileContent,
        department: metadata.department,
        policyNumber: metadata.policyNumber,
        issuer: metadata.issuer,
        type: metadata.type,
        validFrom: metadata.validFrom,
        validTo: metadata.validTo,
        description: metadata.description,
        downloaded_at: new Date(),
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      }
      const result = await collection.insertOne(newPolicy)
      return NextResponse.json({
        success: true,
        message: 'Policy saved successfully',
        policyId: result.insertedId.toString(),
      })
    } else if (policyId) {
      // UPDATE MODE
      const searchCriteria: any = { policyNumber: policyId }
      if (ObjectId.isValid(policyId)) {
        searchCriteria.$or = [
          { policyNumber: policyId },
          { _id: new ObjectId(policyId) }
        ]
        delete searchCriteria.policyNumber
      }
      const existing = await collection.findOne(searchCriteria)
      if (!existing) {
        return NextResponse.json({
          success: false,
          message: `Policy ${policyId} not found`,
        })
      }
      const updateResult = await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            content: fileContent,
            downloaded_at: new Date(),
            'metadata.lastUpdated': new Date().toISOString(),
            'metadata.updatedFileName': file.name,
          },
        }
      )
      if (updateResult.modifiedCount === 0) {
        return NextResponse.json({
          success: false,
          message: 'Failed to update policy',
        })
      }
      return NextResponse.json({
        success: true,
        message: 'Policy updated successfully',
        policyId: existing._id.toString(),
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid request: provide either metadata or policyId',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API/Upload] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to upload policy',
      },
      { status: 500 }
    )
  }
}
