
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AddPersonaDialog } from "@/components/AddPersonaDialog";
import { useQuery } from "@tanstack/react-query";
import { usePersonaContent } from "@/hooks/usePersonaContent";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PersonaData } from '@/types/persona';

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { getPersonas } = usePersonaContent();

  const { data: personas = [], isLoading } = useQuery<PersonaData[]>({
    queryKey: ['personas'],
    queryFn: getPersonas
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-primary">Welcome to ImmutableNPC Hub</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona: PersonaData) => (
            <div 
              key={persona.id} 
              className="p-6 rounded-lg border border-primary/50 hover:border-primary transition-all cursor-pointer"
              onClick={() => navigate(`/chat/${persona.name}`)}
            >
              <h2 className="text-2xl font-bold mb-2">{persona.name}</h2>
              <p className="text-muted-foreground">{persona.description}</p>
            </div>
          ))}
          
          <AddPersonaDialog />
        </div>
      </div>
    </div>
  );
}
