
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AddPersonaDialog } from "@/components/AddPersonaDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersonaContent } from "@/hooks/usePersonaContent";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PersonaData, PersonaState } from '@/types/persona';
import { useWire } from '@/hooks/useWire';
import { usePersonaAvatar } from '@/hooks/usePersonaAvatar';
import { BackstoryHoverCard } from "@/components/BackstoryHoverCard";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { getPersonas, getPersonaInfo, loading: wireLoading, error: wireError } = useWire();
  const { isReady, getContent } = usePersonaContent();
  const { isAuthenticated } = useAuth();
  const { generateAvatar, isGenerating } = usePersonaAvatar();
  const [personaAvatars, setPersonaAvatars] = useState<Map<string, string>>(new Map());
  const queryClient = useQueryClient();

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

            const stateData = await getContent(personaInfo.initial_state_cid) as PersonaState;
            console.log('Persona state data:', stateData);
            
            // Generate avatar if not already generated
            let imageUrl = "/placeholder.svg";
            if (!personaAvatars.has(persona.persona_name)) {
              const avatarBase64 = await generateAvatar(persona.persona_name, stateData.data.text);
              if (avatarBase64) {
                imageUrl = `data:image/png;base64,${avatarBase64}`;
                setPersonaAvatars(prev => new Map(prev).set(persona.persona_name, imageUrl));
              }
            } else {
              imageUrl = personaAvatars.get(persona.persona_name)!;
            }
            
            return {
              name: persona.persona_name,
              backstory: stateData.data.text,
              traits: stateData.data.traits || [],
              imageUrl
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

      return enrichedPersonas;
    },
    enabled: isReady,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  useEffect(() => {
    // Add tilt effect to cards
    const cards = document.querySelectorAll('.persona-card');
    
    const handleMouseMove = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 20;
      const rotateY = -(x - centerX) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      card.style.transition = 'transform 0.1s ease';
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement;
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.transition = 'transform 0.3s ease';
    };

    cards.forEach(card => {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      cards.forEach(card => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [personas]); // Now personas is defined before being used in the dependency array

  const refreshPersonas = () => {
    queryClient.invalidateQueries({ queryKey: ['personas'] });
  };

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-gradient font-heading">Choose Your Chat Companion</h1>
        <AddPersonaDialog onPersonaAdded={refreshPersonas} />
      </div>
      
      {queryError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Error loading personas: {queryError instanceof Error ? queryError.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {!isReady && (
        <Alert className="mb-4 border-primary/20">
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

      {(isLoading || isGenerating) && (
        <Alert className="mb-4 border-primary/20">
          <AlertDescription>
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
              <div>
                <div>Loading personas...</div>
                <div className="text-sm text-muted-foreground">
                  {isGenerating ? "Generating avatars..." : "Fetching data from IPFS network"}
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
            <BackstoryHoverCard key={persona.name} backstory={persona.backstory}>
              <div
                className="persona-card glass-panel rounded-lg p-6 shadow-lg transition-all duration-300 border border-primary/20 hover:border-primary/40 flex flex-col items-center cursor-pointer"
              >
                <img
                  src={persona.imageUrl}
                  alt={persona.name}
                  className="w-28 h-28 mb-4 rounded-full object-cover border-2 border-primary/30"
                />
                <h2 className="text-2xl font-bold mb-3 capitalize text-primary font-heading">{persona.name}</h2>
                <p className="text-muted-foreground mb-4 line-clamp-2 text-center text-sm">
                  {persona.backstory}
                </p>
                {persona.traits && persona.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
                    {persona.traits.map((trait, index) => (
                      <span
                        key={`${trait}-${index}`}
                        className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-xs"
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
            </BackstoryHoverCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
