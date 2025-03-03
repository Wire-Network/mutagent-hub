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
import { Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PinataService } from "@/services/pinata-service";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { getPersonas, getPersonaInfo, loading: wireLoading, error: wireError } = useWire();
  const { isReady, getContent } = usePersonaContent();
  const { isAuthenticated, logout, accountName } = useAuth();
  const { generateAvatar, isGenerating } = usePersonaAvatar();
  const [personaAvatars, setPersonaAvatars] = useState<Map<string, string>>(new Map());
  const queryClient = useQueryClient();
  const pinataService = PinataService.getInstance();

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
            console.log('Persona state data:', JSON.stringify(stateData, null, 2));
            
            // Use stored avatar if available
            let imageUrl = "/placeholder.svg";
            if (stateData.data.avatar_cid) {
              try {
                const avatarData = await pinataService.getContent(stateData.data.avatar_cid);
                console.log('Avatar data from Pinata:', JSON.stringify(avatarData, null, 2));
                
                // Try different possible data structures
                if (avatarData && typeof avatarData === 'object') {
                  if ('imageData' in avatarData) {
                    imageUrl = `data:image/png;base64,${avatarData.imageData}`;
                  } else if ('data' in avatarData && 'imageData' in avatarData.data) {
                    imageUrl = `data:image/png;base64,${avatarData.data.imageData}`;
                  }
                  
                  if (imageUrl !== "/placeholder.svg") {
                    setPersonaAvatars(prev => new Map(prev).set(persona.persona_name, imageUrl));
                  } else {
                    console.error('Invalid avatar data structure:', avatarData);
                  }
                }
              } catch (error) {
                console.error(`Error fetching avatar for ${persona.persona_name}:`, error);
              }
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
  }, [personas]);

  const refreshPersonas = () => {
    queryClient.invalidateQueries({ queryKey: ['personas'] });
  };

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <div className="border-b border-primary/20 bg-secondary/30 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Logo and Welcome */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-primary font-heading">Mutagent</h2>
              <span className="hidden sm:inline-block text-muted-foreground">|</span>
              <div className="hidden sm:block text-xl font-heading text-primary">
                Welcome back, <span className="font-bold">{accountName}</span>
              </div>
            </div>
            
            {/* Search and Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
                <Input
                  type="text"
                  placeholder="Search personas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/20 border-primary/20 w-full"
                />
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-primary"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Alerts */}
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
            </AlertDescription>
          </Alert>
        )}

        {(isLoading || isGenerating) && (
          <Alert className="mb-4 border-primary/20">
            <AlertDescription>
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                <div>
                  Loading personas...
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Header with Add Persona Button */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold font-heading text-primary">Your AI Companions</h3>
          <AddPersonaDialog onPersonaAdded={refreshPersonas} />
        </div>

        {/* Persona Grid */}
        {personas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No personas available. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPersonas.map((persona) => (
              <div
                key={persona.name}
                className="persona-card rounded-lg p-4 md:p-6 shadow-lg transition-all duration-300 border border-primary/20 hover:border-primary/40 flex flex-col items-center"
              >
                <img
                  src={persona.imageUrl}
                  alt={persona.name}
                  className="w-20 h-20 md:w-28 md:h-28 mb-3 md:mb-4 rounded-full object-cover border-2 border-primary/30"
                />
                <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 capitalize text-primary font-heading">{persona.name}</h2>
                <p className="text-muted-foreground mb-3 md:mb-4 line-clamp-2 text-center text-sm">
                  {persona.backstory}
                </p>
                {persona.traits && persona.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1 md:gap-1.5 mb-3 md:mb-4 justify-center">
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
                  className="w-full cyber-button mt-auto min-h-[44px]"
                  onClick={() => navigate(`/chat/${persona.name.toLowerCase()}`)}
                >
                  Chat Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
