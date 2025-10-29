"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type PolicyFormData, validatePolicyForm, type ValidationError } from "@/lib/types"

interface PolicyFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PolicyFormData) => void
  isLoading?: boolean
  initialData?: PolicyFormData | null // new prop for edit mode
}

export function PolicyFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData = null,
}: PolicyFormModalProps) {
  // Use initialData if given, otherwise start blank
  const [formData, setFormData] = useState<PolicyFormData>(
    initialData || {
      policyName: "",
      policyNumber: "",
      issuer: "",
      type: "",
      validFrom: "",
      validTo: "",
      description: "",
      department: "health",
    }
  )

  // Refill form when initialData changes (for edit mode)
  useEffect(() => {
    if (isOpen && initialData) setFormData(initialData)
    if (isOpen && !initialData) setFormData({
      policyName: "",
      policyNumber: "",
      issuer: "",
      type: "",
      validFrom: "",
      validTo: "",
      description: "",
      department: "health",
    })
  }, [isOpen, initialData])

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<ValidationError[]>([])

  const getFieldError = (fieldName: string): string | undefined =>
    errors.find((e) => e.field === fieldName)?.message

  const handleChange = (field: keyof PolicyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      const newErrors = validatePolicyForm({ ...formData, [field]: value })
      setErrors(newErrors)
    }
  }

  const handleBlur = (field: keyof PolicyFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const newErrors = validatePolicyForm(formData)
    setErrors(newErrors)
  }

  const handleSubmit = () => {
    const validationErrors = validatePolicyForm(formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      const allTouched = Object.keys(formData).reduce(
        (acc, key) => {
          acc[key] = true
          return acc
        },
        {} as Record<string, boolean>
      )
      setTouched(allTouched)
      return
    }
    onSubmit(formData)
  }

  const isFormValid = errors.length === 0 && Object.values(formData).every((v) => v !== "")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Policy" : "Create New Policy"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Policy Name */}
          <div className="space-y-2">
            <Label htmlFor="policyName">Policy Name *</Label>
            <Input
              id="policyName"
              value={formData.policyName}
              onChange={(e) => handleChange("policyName", e.target.value)}
              onBlur={() => handleBlur("policyName")}
              placeholder="e.g., Vaccination Policy 2024"
              className={getFieldError("policyName") ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {touched.policyName && getFieldError("policyName") && (
              <p className="text-sm text-destructive">{getFieldError("policyName")}</p>
            )}
          </div>
          {/* Policy Number */}
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number *</Label>
            <Input
              id="policyNumber"
              value={formData.policyNumber}
              onChange={(e) => handleChange("policyNumber", e.target.value)}
              onBlur={() => handleBlur("policyNumber")}
              placeholder="e.g., POL-2024-001"
              className={getFieldError("policyNumber") ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {touched.policyNumber && getFieldError("policyNumber") && (
              <p className="text-sm text-destructive">{getFieldError("policyNumber")}</p>
            )}
          </div>
          {/* Issuer */}
          <div className="space-y-2">
            <Label htmlFor="issuer">Issuer *</Label>
            <Input
              id="issuer"
              value={formData.issuer}
              onChange={(e) => handleChange("issuer", e.target.value)}
              onBlur={() => handleBlur("issuer")}
              placeholder="e.g., Ministry of Healthcare"
              className={getFieldError("issuer") ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {touched.issuer && getFieldError("issuer") && (
              <p className="text-sm text-destructive">{getFieldError("issuer")}</p>
            )}
          </div>
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value)}
              onBlur={() => handleBlur("type")}
              placeholder="e.g., Regulatory, Procedural, Guidelines"
              className={getFieldError("type") ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {touched.type && getFieldError("type") && (
              <p className="text-sm text-destructive">{getFieldError("type")}</p>
            )}
          </div>
          {/* Valid From and Valid To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => handleChange("validFrom", e.target.value)}
                onBlur={() => handleBlur("validFrom")}
                className={getFieldError("validFrom") ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {touched.validFrom && getFieldError("validFrom") && (
                <p className="text-sm text-destructive">{getFieldError("validFrom")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To *</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => handleChange("validTo", e.target.value)}
                onBlur={() => handleBlur("validTo")}
                className={getFieldError("validTo") ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {touched.validTo && getFieldError("validTo") && (
                <p className="text-sm text-destructive">{getFieldError("validTo")}</p>
              )}
            </div>
          </div>
          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select value={formData.department} onValueChange={(value) => handleChange("department", value)}>
              <SelectTrigger id="department" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
                <SelectItem value="agriculture">Agriculture</SelectItem>
              </SelectContent>
            </Select>
            {touched.department && getFieldError("department") && (
              <p className="text-sm text-destructive">{getFieldError("department")}</p>
            )}
          </div>
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Provide a detailed description of the policy..."
              rows={4}
              className={getFieldError("description") ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {touched.description && getFieldError("description") && (
              <p className="text-sm text-destructive">{getFieldError("description")}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (initialData ? "Updating..." : "Processing...") : (initialData ? "Update" : "Continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
