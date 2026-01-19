import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, UploadCloud, FileText } from "lucide-react"

export function PolicyActionsPanel() {
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', message: string }
  const [analysis, setAnalysis] = useState("")

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setStatus(null)
      setAnalysis("")
    }
  }

  const handleCheckConflict = async () => {
    if (!file) return
    setIsLoading(true)
    setStatus(null)
    setAnalysis("")

    const formData = new FormData()
    formData.append('file', file)

    try {
        const response = await fetch('/api/check-conflict', {
            method: 'POST',
            body: formData
        })
        const data = await response.json()
        
        if (data.error) throw new Error(data.error)

        setAnalysis(data.analysis)
        setStatus({ 
            type: data.hasConflict ? "error" : "success", 
            message: data.hasConflict ? "Conflicts Detected" : "No Conflicts Found" 
        })

    } catch (error) {
        setStatus({ type: "error", message: "Analysis Failed: " + error.message })
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="w-full bg-card p-6 space-y-6 animate-in slide-in-from-left-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Actions</h2>
        <p className="text-sm text-muted-foreground">Upload existing policies to check for legal contradictions.</p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="file-upload">Upload Document (PDF)</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
            <Input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                accept=".pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
                {file ? <FileText className="h-8 w-8 text-blue-500" /> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">
                    {file ? file.name : "Click to browse"}
                </span>
            </div>
        </div>
      </div>

      <Button
        onClick={handleCheckConflict}
        disabled={!file || isLoading}
        className="w-full"
      >
        {isLoading ? "Analyzing..." : "Check for Conflicts"}
      </Button>
      
      {status && (
        <Alert variant={status.type === "error" ? "destructive" : "default"} className={status.type === "success" ? "border-green-500 text-green-600 bg-green-50" : ""}>
          {status.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{status.message}</AlertDescription>
        </Alert>
      )}

      {analysis && (
          <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto border border-border">
              {analysis}
          </div>
      )}
    </div>
  )
}