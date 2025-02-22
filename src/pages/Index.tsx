
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { motion } from "framer-motion";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { getPersonas, getPersonaInfo, loading: wireLoading, error: wireError } = useWire();
  const { isReady, getContent } = usePersonaContent();
  const { isAuthenticated } = useAuth();
  const { generateAvatar, isGenerating } = usePersonaAvatar();
  const [personaAvatars, setPersonaAvatars] = useState<Map<string, string>>(new Map());
  const queryClient = useQueryClient();

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
    staleTime: Infinity, // Never mark the data as stale automatically
    gcTime: 24 * 60 * 60 * 1000, // Keep unused data in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Function to manually invalidate the personas query
  const refreshPersonas = () => {
    queryClient.invalidateQueries({ queryKey: ['personas'] });
  };

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto px-4 py-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-4xl font-bold">Choose Your Chat Companion</h1>
          <AddPersonaDialog onPersonaAdded={refreshPersonas} />
        </motion.div>
        
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

        {(isLoading || isGenerating) && (
          <Alert className="mb-4">
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-muted-foreground"
          >
            No personas available. Create one to get started!
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPersonas.map((persona, index) => (
              <motion.div
                key={persona.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="bg-card/70 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <img
                  src={persona.imageUrl}
                  alt={persona.name}
                  className="w-32 h-32 mx-auto mb-4 rounded-full object-cover"
                />
                <h2 className="text-2xl font-bold mb-2 capitalize">{persona.name}</h2>
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {persona.backstory}
                </p>
                {persona.traits && persona.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {persona.traits.map((trait, index) => (
                      <span
                        key={`${trait}-${index}`}
                        className="bg-accent/50 px-2 py-1 rounded-full text-xs"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => navigate(`/chat/${persona.name.toLowerCase()}`)}
                >
                  Chat Now
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
};

export default Index;
