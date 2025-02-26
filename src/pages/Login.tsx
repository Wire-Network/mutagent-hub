import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { WireService } from "@/services/wire-service";
import { EthereumService } from "@/services/ethereum-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Import your logo. Adjust the path as needed.
import mutagentLogo from "@/assets/mutagent-lg.png";

const Login = () => {
    const [accountName, setAccountName] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setCredentials, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const wireService = WireService.getInstance();
    const ethereumService = EthereumService.getInstance();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // const handlePrivateKeySubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     setIsLoading(true);

    //     try {
    //         const trimmedAccount = accountName.trim();
    //         const trimmedKey = privateKey.trim();

    //         const isValid = await wireService.verifyAccount(trimmedAccount, trimmedKey);
            
    //         if (!isValid) {
    //             throw new Error("Invalid account name or private key");
    //         }

    //         await setCredentials(trimmedAccount, trimmedKey);
    //         toast({
    //             title: "Success",
    //             description: "Successfully logged in!",
    //         });
    //         navigate('/');
    //     } catch (error) {
    //         toast({
    //             variant: "destructive",
    //             title: "Error",
    //             description: error instanceof Error ? error.message : "Failed to login",
    //         });
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    const handleWalletLogin = async () => {
        setIsLoading(true);
        try {
            // Connect wallet
            const account = await ethereumService.connectWallet();
            
            // Check if account exists on WIRE
            const exists = await ethereumService.verifyAccount(account.address);
            
            if (!exists) {
                // Create new account if it doesn't exist
                await ethereumService.createWireAccount(account.address);
                toast({
                    title: "Account Created",
                    description: "Your WIRE account has been created successfully!",
                });
            }

            // Set credentials (we don't store private key for wallet login)
            await setCredentials(account.username, "");
            
            toast({
                title: "Success",
                description: "Successfully connected with wallet!",
            });
            navigate('/');
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to connect wallet",
            });
            ethereumService.disconnect();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 px-4">
                <div className="text-center">
                    {/* Logo added above the title */}
                    <img 
                        src={mutagentLogo} 
                        alt="Mutagent Logo" 
                        className="mx-auto mb-4 h-56 w-auto" 
                    />
                    <h2 className="mt-6 text-3xl font-bold tracking-tight">
                        Welcome to Mutagent
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your account
                    </p>
                </div>

                <Tabs defaultValue="wallet" className="w-full">
                    <TabsContent value="wallet">
                        <Button
                            onClick={handleWalletLogin}
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? "Connecting..." : "Connect Wallet"}
                            </Button>
                    </TabsContent>

                    {/* <TabsContent value="private-key">
                        <form className="mt-8 space-y-6" onSubmit={handlePrivateKeySubmit}>
                            <div className="space-y-4 rounded-md shadow-sm">
                                <div>
                                    <label htmlFor="account-name" className="sr-only">
                                        Account Name
                                    </label>
                                    <Input
                                        id="account-name"
                                        name="account"
                                        type="text"
                                        required
                                        value={accountName}
                                        onChange={(e) => setAccountName(e.target.value)}
                                        placeholder="Account Name"
                                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-muted placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="private-key" className="sr-only">
                                        Private Key
                                    </label>
                                    <Input
                                        id="private-key"
                                        name="privateKey"
                                        type="password"
                                        required
                                        value={privateKey}
                                        onChange={(e) => setPrivateKey(e.target.value)}
                                        placeholder="Private Key"
                                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-muted placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Signing in..." : "Sign in"}
                                </Button>
                            </div>
                        </form>
                    </TabsContent> */}
                </Tabs>
            </div>
        </div>
    );
};

export default Login;
