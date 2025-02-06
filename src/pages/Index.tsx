
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data - in a real app, this would come from a backend
const mockPersonas = [
  {
    name: "Batman",
    backstory: "The Dark Knight of Gotham City, a vigilante who fights crime using his intellect, martial arts skills, and advanced technology.",
    traits: ["Detective", "Vigilante", "Billionaire", "Martial Artist"],
    imageUrl: "/placeholder.svg"
  },
  {
    name: "Iron Man",
    backstory: "Genius billionaire Tony Stark uses his high-tech suit of armor to protect the world as Iron Man.",
    traits: ["Genius", "Inventor", "Billionaire", "Futurist"],
    imageUrl: "/placeholder.svg"
  },
  {
    name: "Sherlock Holmes",
    backstory: "The world's greatest detective, known for his intellectual prowess and deductive reasoning.",
    traits: ["Detective", "Intellectual", "Observant", "Eccentric"],
    imageUrl: "/placeholder.svg"
  }
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredPersonas = mockPersonas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.traits.some(trait => trait.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Choose Your Chat Companion</h1>
      
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or trait..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

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
    </div>
  );
};

export default Index;
