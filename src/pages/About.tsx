
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <h1 className="text-4xl font-bold mb-8 text-primary">About ImmutableNPC Hub</h1>
      
      <div className="space-y-6 text-lg">
        <p>
          ImmutableNPC Hub is a revolutionary platform that brings blockchain-powered NPCs (Non-Player Characters) to life. Our platform enables users to interact with AI personas that evolve over time while maintaining a verifiable history on the blockchain.
        </p>

        <p>
          Each NPC in our ecosystem has its own unique personality and backstory, stored securely on IPFS and referenced through smart contracts. As you chat with these characters, their responses and personality development are recorded in a tamper-evident manner.
        </p>

        <div className="bg-secondary/30 p-6 rounded-lg mt-8">
          <h2 className="text-2xl font-bold mb-4 text-primary">Key Features</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>On-chain NPC persona storage and evolution</li>
            <li>Decentralized conversation history</li>
            <li>AI-powered character interactions</li>
            <li>Verifiable character development</li>
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-primary">Explore More</h2>
          <p className="mb-4">
            Want to learn more about the WIRE blockchain and its capabilities?
          </p>
          <Button 
            variant="default" 
            onClick={() => window.open('https://explore.wire.foundation', '_blank')}
          >
            Visit WIRE Explorer
          </Button>
        </div>
      </div>
    </div>
  );
}
