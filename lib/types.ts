// Policy-related types and interfaces
export interface PolicyFormData {
  policyName: string
  policyNumber: string
  issuer: string
  type: string
  validFrom: string
  validTo: string
  description: string
  department: "health" | "finance" | "education" | "environment" | "agriculture"
}

// Policy Document in MongoDB
export interface PolicyDocument {
  _id?: string
  title: string
  url?: string
  downloaded_at?: Date
  content: string
  department: string
  policyNumber?: string
  issuer?: string
  type?: string
  validFrom?: string
  validTo?: string
  description?: string
  metadata?: Record<string, any>
}

export interface PolicyUpdateData {
  policyId: string
}

export interface ConflictCheckResponse {
  hasConflict: boolean
  conflicts?: string[]
  suggestions?: string[]
  message: string
}

export interface UploadPolicyResponse {
  success: boolean
  message: string
  policyId?: string
}

export interface SearchResponse {
  results: string[]
  message: string
}

export interface ValidationError {
  field: string
  message: string
}

// Form field validation
export const validatePolicyForm = (data: PolicyFormData): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!data.policyName.trim()) {
    errors.push({ field: "policyName", message: "Required" })
  }
  if (!data.policyNumber.trim()) {
    errors.push({ field: "policyNumber", message: "Required" })
  }
  if (!data.issuer.trim()) {
    errors.push({ field: "issuer", message: "Required" })
  }
  if (!data.type.trim()) {
    errors.push({ field: "type", message: "Required" })
  }
  if (!data.validFrom) {
    errors.push({ field: "validFrom", message: "Required" })
  }
  if (!data.validTo) {
    errors.push({ field: "validTo", message: "Required" })
  }
  if (!data.description.trim()) {
    errors.push({ field: "description", message: "Required" })
  }
  if (!data.department) {
    errors.push({ field: "department", message: "Required" })
  }

  // Validate date range
  if (data.validFrom && data.validTo) {
    const fromDate = new Date(data.validFrom)
    const toDate = new Date(data.validTo)
    if (fromDate >= toDate) {
      errors.push({ field: "validTo", message: "Must be after Valid From date" })
    }
  }

  return errors
}

export const validatePolicyId = (policyId: string): ValidationError[] => {
  const errors: ValidationError[] = []
  if (!policyId.trim()) {
    errors.push({ field: "policyId", message: "Required" })
  }
  return errors
}
