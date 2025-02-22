
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button 
        variant="outline" 
        onClick={() => navigate("/")}
        className="mb-8"
      >
        ← Back to Home
      </Button>

      <div className="space-y-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-4 font-heading">ImmutableNPC-Hub</h1>
          <p className="text-xl text-muted-foreground">
            A revolutionary platform for interacting with on-chain NPCs that evolve over time
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-primary font-heading">About the Project</h2>
            <p className="text-muted-foreground leading-relaxed">
              ImmutableNPC-Hub is a cutting-edge front-end application that enables users to engage with 
              Non-Player Characters (NPCs) whose personas are stored and evolve on the blockchain. Our platform 
              combines the immutability of blockchain technology with the adaptability of AI to create unique, 
              evolving characters.
            </p>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
            alt="Developer working on laptop" 
            className="rounded-lg shadow-lg border border-primary/20"
          />
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-xl font-bold text-primary mb-3 font-heading">Blockchain Integration</h3>
            <p className="text-muted-foreground">
              Connect your Web3 wallet to interact with NPCs, with all conversations and persona updates 
              securely stored on the blockchain.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-xl font-bold text-primary mb-3 font-heading">Evolving Personas</h3>
            <p className="text-muted-foreground">
              Watch as NPCs develop unique personalities over time through interactions, 
              with all changes recorded immutably on-chain.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-xl font-bold text-primary mb-3 font-heading">IPFS Storage</h3>
            <p className="text-muted-foreground">
              All conversations and persona data are stored on IPFS, ensuring decentralized 
              and permanent access to your interactions.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-primary mb-6 font-heading">Ready to Start?</h2>
          <Button 
            onClick={() => navigate("/")}
            className="cyber-button"
          >
            Explore NPCs Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default About;
