"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { PolicyFormModal } from "./policy-form-modal"
import type { PolicyFormData, ConflictCheckResponse, UploadPolicyResponse } from "@/lib/types"

type ActionType = "create" | "update" | null

export function PolicyActionsPanel() {
  const [action, setAction] = useState<ActionType>(null)
  const [file, setFile] = useState<File | null>(null)
  const [policyId, setPolicyId] = useState("")
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [formData, setFormData] = useState<PolicyFormData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hasConflict, setHasConflict] = useState(false)
  const [canSave, setCanSave] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setStatus(null)
      setSuggestions([])
      setHasConflict(false)
      setCanSave(false)
    }
  }

  const handleActionChange = (value: string) => {
    const newAction = value as ActionType
    setAction(newAction)
    setStatus(null)
    setSuggestions([])
    setHasConflict(false)
    setCanSave(false)
    setPolicyId("")
    if (newAction === "create") setIsFormModalOpen(true)
  }

  const handleFormSubmit = (data: PolicyFormData) => {
    setFormData(data)
    setIsFormModalOpen(false)
  }

  const isCheckConflictDisabled =
    !file || !action || (action === "create" && !formData) || (action === "update" && !policyId)

  const handleCheckConflict = async () => {
    if (!file) return
    setIsLoading(true)
    setStatus(null)
    setSuggestions([])
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("file", file)
      if (action === "create" && formData) {
        formDataToSend.append("metadata", JSON.stringify(formData))
      } else if (action === "update") {
        formDataToSend.append("policyId", policyId)
      }

      const response = await fetch("/api/check-policy-conflict", {
        method: "POST",
        body: formDataToSend,
      })

      const data: ConflictCheckResponse = await response.json()

      if (data.hasConflict) {
        setStatus({ type: "warning", message: data.message })
        setSuggestions(data.suggestions || [])
        setHasConflict(true)
      } else {
        setStatus({ type: "success", message: data.message })
        setCanSave(true)
        setHasConflict(false)
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to check conflicts",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!file) return
    setIsLoading(true)
    setStatus(null)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("file", file)
      if (action === "create" && formData) {
        formDataToSend.append("metadata", JSON.stringify(formData))
      } else if (action === "update") {
        formDataToSend.append("policyId", policyId)
      }

      const response = await fetch("/api/upload-policy", {
        method: "POST",
        body: formDataToSend,
      })

      const data: UploadPolicyResponse = await response.json()

      if (data.success) {
        setStatus({ type: "success", message: data.message })
        setFile(null)
        setFormData(null)
        setPolicyId("")
        setAction(null)
        setCanSave(false)
        setSuggestions([])
      } else {
        setStatus({ type: "error", message: data.message })
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save policy",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full lg:w-96 bg-card border-r border-border p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Upload and Policy Actions</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage policy documents and check for conflicts</p>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file-upload">Upload Policy Document</Label>
        <div className="relative">
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            disabled={isLoading}
            className="cursor-pointer"
          />
          {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name}</p>}
        </div>
      </div>

      {/* Action Selection */}
      <div className="space-y-2">
        <Label htmlFor="action-select">Select Action</Label>
        <Select value={action || ""} onValueChange={handleActionChange}>
          <SelectTrigger id="action-select" disabled={isLoading}>
            <SelectValue placeholder="Select Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create Action - Form Display */}
      {action === "create" && formData && (
        <Card className="p-4 bg-muted">
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Policy Name</p>
              <p className="font-medium text-foreground">{formData.policyName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Policy Number</p>
              <p className="font-medium text-foreground">{formData.policyNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium text-foreground capitalize">{formData.department}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Update Action - Policy ID Input */}
      {action === "update" && (
        <div className="space-y-2">
          <Label htmlFor="policy-id">Policy ID</Label>
          <Input
            id="policy-id"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            placeholder="Enter Policy ID"
            disabled={isLoading}
          />
        </div>
      )}

      {/* Status Messages */}
      {status && (
        <Alert className={status.type === "error" ? "border-destructive bg-destructive/10" : ""}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Suggested Changes:</p>
          <ul className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                • {suggestion}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={handleCheckConflict}
          disabled={isCheckConflictDisabled || isLoading}
          className={`w-full ${
            isCheckConflictDisabled || isLoading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLoading ? "Checking..." : "Check Conflict"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave || isLoading}
          className={`w-full ${
            !canSave || isLoading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Policy Form Modal */}
      <PolicyFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} onSubmit={handleFormSubmit} />
    </div>
  )
}
