
import { Input } from "@/components/ui/input"

interface PersonaTraitsInputProps {
  value: string
  onChange: (value: string) => void
}

export function PersonaTraitsInput({ value, onChange }: PersonaTraitsInputProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor="traits">Traits</label>
      <Input
        id="traits"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Detective, Vigilante, Billionaire (comma-separated)"
        required
      />
    </div>
  )
}
