
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface PersonaNameInputProps {
  value: string
  onChange: (value: string, isValid: boolean) => void
}

export function PersonaNameInput({ value, onChange }: PersonaNameInputProps) {
  const [nameError, setNameError] = useState("")

  const validateName = (value: string) => {
    setNameError("")
    if (!value.endsWith('.ai')) {
      setNameError("Name must end with .ai")
      return false
    }
    const baseName = value.slice(0, -3)
    if (baseName.length !== 9) {
      setNameError("Name must be exactly 9 characters (excluding .ai)")
      return false
    }
    if (!/^[a-z1-5]+$/.test(baseName)) {
      setNameError("Only lowercase letters a-z and numbers 1-5 are allowed")
      return false
    }
    if (value.length !== 12) {
      setNameError("Total name length must be exactly 12 characters")
      return false
    }
    return true
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase()
    const isValid = validateName(newValue)
    onChange(newValue, isValid)
  }

  return (
    <div className="grid gap-2">
      <label htmlFor="name">Name</label>
      <Input
        id="name"
        value={value}
        onChange={handleChange}
        placeholder="e.g. starkbot15.ai"
        required
        className={nameError ? "border-red-500" : ""}
        pattern="[a-z1-5]{9}\.ai"
        title="Must be 9 characters using only lowercase letters and numbers 1-5, followed by .ai"
      />
      {nameError && (
        <p className="text-sm text-red-500">{nameError}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Must be exactly 9 characters using only lowercase letters and numbers 1-5, followed by .ai
      </p>
    </div>
  )
}
