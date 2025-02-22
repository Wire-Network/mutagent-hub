
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { WireService } from "@/services/wire-service";
import { MetaMaskService } from "@/services/metamask-service";
import { Wallet } from "lucide-react";

const Login = () => {
    const [accountName, setAccountName] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setCredentials, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const wireService = WireService.getInstance();
    const metamaskService = MetaMaskService.getInstance();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const trimmedAccount = accountName.trim();
            const trimmedKey = privateKey.trim();

            const isValid = await wireService.verifyAccount(trimmedAccount, trimmedKey);
            
            if (!isValid) {
                throw new Error("Invalid account name or private key");
            }

            await setCredentials(trimmedAccount, trimmedKey);
            toast({
                title: "Success",
                description: "Successfully logged in!",
            });
            navigate('/');
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to login",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMetaMaskLogin = async () => {
        setIsLoading(true);
        try {
            const address = await metamaskService.connectWallet();
            
            // For now, we'll use a simple message to sign
            const message = `Login to WIRE with account: ${accountName}`;
            const signature = await metamaskService.signMessage(message);
            
            // Store the signature in localStorage for future use
            localStorage.setItem('metamask_signature', signature);
            localStorage.setItem('metamask_address', address);
            
            toast({
                title: "Success",
                description: "Successfully connected with MetaMask!",
            });
            
            navigate('/');
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to connect with MetaMask",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-lg shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Welcome Back</h2>
                    <p className="mt-2 text-muted-foreground">
                        Please sign in to continue
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <Button
                        onClick={handleMetaMaskLogin}
                        className="w-full cyber-button"
                        disabled={isLoading}
                    >
                        <Wallet className="mr-2 h-4 w-4" />
                        {isLoading ? "Connecting..." : "Connect with MetaMask"}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="accountName" className="block text-sm font-medium mb-2">
                                Account Name
                            </label>
                            <Input
                                id="accountName"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="e.g. nodeowner1"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="privateKey" className="block text-sm font-medium mb-2">
                                Private Key
                            </label>
                            <Input
                                id="privateKey"
                                type="password"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder="Enter your WIRE private key"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full cyber-button"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign in with Private Key"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
