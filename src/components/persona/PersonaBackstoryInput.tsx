
import { Textarea } from "@/components/ui/textarea"

interface PersonaBackstoryInputProps {
  value: string
  onChange: (value: string) => void
}

export function PersonaBackstoryInput({ value, onChange }: PersonaBackstoryInputProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor="backstory">Backstory</label>
      <Textarea
        id="backstory"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell us about this character's background..."
        required
      />
    </div>
  )
}
