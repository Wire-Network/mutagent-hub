import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddPersonaDialog } from "@/components/AddPersonaDialog";
import { useQuery } from "@tanstack/react-query";
import { WireService } from "@/services/wire-service";
import { useIpfs } from "@/hooks/useIpfs";

interface PersonaData {
  name: string;
  backstory: string;
  traits: string[];
  imageUrl?: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const wireService = WireService.getInstance();
  const { fetchMessage } = useIpfs();

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const rawPersonas = await wireService.getPersonas();
      if (!rawPersonas.length) {
        return [] as PersonaData[];
      }

      const enrichedPersonas = await Promise.all(
        rawPersonas.map(async (persona) => {
          try {
            // Get detailed persona info
            const personaDetails = await wireService.getPersona(persona.persona_name);
            console.log(personaDetails);
            if (!personaDetails.initial_state_cid) {
              console.warn(`No state CID found for persona ${persona.persona_name}`);
              return {
                name: persona.persona_name,
                backstory: "Persona state not initialized",
                traits: [],
                imageUrl: "/placeholder.svg"
              } as PersonaData;
            }

            const stateData = await fetchMessage(personaDetails.initial_state_cid);
            return {
              name: persona.persona_name,
              backstory: stateData.text || "",
              traits: stateData.traits || [],
              imageUrl: "/placeholder.svg"
            } as PersonaData;
          } catch (error) {
            console.error(`Error fetching persona data for ${persona.persona_name}:`, error);
            return {
              name: persona.persona_name,
              backstory: "Failed to load persona data",
              traits: [],
              imageUrl: "/placeholder.svg"
            } as PersonaData;
          }
        })
      );
      return enrichedPersonas;
    },
  });

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Choose Your Chat Companion</h1>
        <AddPersonaDialog />
      </div>
      
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or trait..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center">Loading personas...</div>
      ) : personas.length === 0 ? (
        <div className="text-center text-muted-foreground">
          No personas available. Create one to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonas.map((persona) => (
            <div
              key={persona.name}
              className="bg-card rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <img
                src={persona.imageUrl}
                alt={persona.name}
                className="w-32 h-32 mx-auto mb-4 rounded-full"
              />
              <h2 className="text-2xl font-bold mb-2">{persona.name}</h2>
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {persona.backstory}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {persona.traits.map((trait) => (
                  <span
                    key={trait}
                    className="bg-accent px-2 py-1 rounded-full text-xs"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => navigate(`/chat/${persona.name.toLowerCase()}`)}
              >
                Chat Now
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
