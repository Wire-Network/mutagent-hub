
import { Button } from "@/components/ui/button";
import { PersonaData } from "@/types/persona";
import { useNavigate } from "react-router-dom";

interface PersonaCardProps {
  persona: PersonaData;
}

export const PersonaCard = ({ persona }: PersonaCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="persona-card glass-panel rounded-lg p-8 shadow-lg transition-all duration-300 border border-primary/20 hover:border-primary/40 flex flex-col items-center"
    >
      <img
        src={persona.imageUrl}
        alt={persona.name}
        className="w-40 h-40 mb-6 rounded-full object-cover border-2 border-primary/30"
      />
      <h2 className="text-3xl font-bold mb-4 capitalize text-primary font-heading">{persona.name}</h2>
      <p className="text-muted-foreground mb-6 line-clamp-3 text-center">
        {persona.backstory}
      </p>
      {persona.traits && persona.traits.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {persona.traits.map((trait, index) => (
            <span
              key={`${trait}-${index}`}
              className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-sm"
            >
              {trait}
            </span>
          ))}
        </div>
      )}
      <Button
        className="w-full cyber-button mt-auto"
        onClick={() => navigate(`/chat/${persona.name.toLowerCase()}`)}
      >
        Chat Now
      </Button>
    </div>
  );
};
