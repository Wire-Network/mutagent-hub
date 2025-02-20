import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddPersonaDialog } from "@/components/AddPersonaDialog";
import { useQuery } from "@tanstack/react-query";
import { usePersonaContent } from "@/hooks/usePersonaContent";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PersonaData } from '@/types/persona';
import { useWire } from '@/hooks/useWire';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { getPersonas, getPersonaInfo, loading: wireLoading, error: wireError } = useWire();
  const { isReady, getContent } = usePersonaContent();
  const { isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const { data: personas = [], isLoading, error: queryError } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      if (!isReady) {
        throw new Error("IPFS not initialized yet");
      }

      console.log('Fetching personas from blockchain...');
      const rawPersonas = await getPersonas();
      console.log('Found personas:', rawPersonas);

      if (!rawPersonas.length) {
        return [] as PersonaData[];
      }

      console.log('Fetching persona details...');
      const enrichedPersonas = await Promise.all(
        rawPersonas.map(async (persona) => {
          try {
            const personaInfo = await getPersonaInfo(persona.persona_name);
            
            if (!personaInfo?.initial_state_cid) {
              console.warn(`No initial state CID found for persona ${persona.persona_name}`);
              return {
                name: persona.persona_name,
                backstory: "Persona state not initialized",
                traits: [],
                imageUrl: "/placeholder.svg"
              };
            }

            const stateData = await getContent(personaInfo.initial_state_cid);
            
            return {
              name: persona.persona_name,
              backstory: stateData.text || "",
              traits: stateData.traits || [],
              imageUrl: "/placeholder.svg"
            };
          } catch (error) {
            console.error(`Error fetching data for ${persona.persona_name}:`, error);
            return {
              name: persona.persona_name,
              backstory: "Failed to load persona data",
              traits: [],
              imageUrl: "/placeholder.svg"
            };
          }
        })
      );

      console.log('Final enriched personas:', enrichedPersonas);
      return enrichedPersonas;
    },
    enabled: isReady,
    refetchInterval: 5000,
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
      
      {queryError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Error loading personas: {queryError instanceof Error ? queryError.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {!isReady && (
        <Alert className="mb-4">
          <AlertDescription>
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
              Initializing IPFS connection...
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              This may take a few moments. Please wait...
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Alert className="mb-4">
          <AlertDescription>
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
              <div>
                <div>Loading personas...</div>
                <div className="text-sm text-muted-foreground">
                  Fetching data from IPFS network
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {personas.length === 0 ? (
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
