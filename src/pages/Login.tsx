import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { WireService } from "@/services/wire-service";

const Login = () => {
    const [accountName, setAccountName] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setCredentials, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const wireService = WireService.getInstance();

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

            // Verify account and private key
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-lg shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Welcome Back</h2>
                    <p className="mt-2 text-muted-foreground">
                        Please sign in to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
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
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Login;
