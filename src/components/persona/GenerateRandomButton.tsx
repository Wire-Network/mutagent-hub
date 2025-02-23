
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"

interface GenerateRandomButtonProps {
  onClick: () => void
  isGenerating: boolean
}

export function GenerateRandomButton({ onClick, isGenerating }: GenerateRandomButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={onClick}
      disabled={isGenerating}
    >
      <Wand2 className="h-4 w-4" />
      {isGenerating ? "Generating..." : "Generate Random"}
    </Button>
  )
}
