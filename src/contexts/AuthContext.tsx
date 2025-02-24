import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PrivateKey } from '@wireio/core';
import { EthereumService } from '@/services/ethereum-service';

interface AuthContextType {
    isAuthenticated: boolean;
    accountName: string | null;
    privateKey: string | null;
    isWalletAuth: boolean;
    setCredentials: (account: string, key: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accountName, setAccountName] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [isWalletAuth, setIsWalletAuth] = useState(false);
    const ethereumService = EthereumService.getInstance();

    useEffect(() => {
        const storedKey = localStorage.getItem('wire_private_key');
        const storedAccount = localStorage.getItem('wire_account_name');
        const storedAuthType = localStorage.getItem('wire_auth_type');
        
        if (storedAccount) {
            setAccountName(storedAccount);
            if (storedAuthType === 'wallet') {
                setIsWalletAuth(true);
                setIsAuthenticated(true);
            } else if (storedKey) {
                setPrivateKey(storedKey);
                setIsAuthenticated(true);
            }
        }
    }, []);

    const setCredentials = (account: string, key: string) => {
        try {
            // For wallet auth, we don't validate or store private key
            const isWallet = key === '';
            if (!isWallet) {
                PrivateKey.from(key); // Validate private key format
                localStorage.setItem('wire_private_key', key);
                setPrivateKey(key);
            }
            
            localStorage.setItem('wire_account_name', account);
            localStorage.setItem('wire_auth_type', isWallet ? 'wallet' : 'key');
            setAccountName(account);
            setIsWalletAuth(isWallet);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Invalid private key:', error);
            throw new Error('Invalid private key format');
        }
    };

    const logout = () => {
        localStorage.removeItem('wire_private_key');
        localStorage.removeItem('wire_account_name');
        localStorage.removeItem('wire_auth_type');
        setPrivateKey(null);
        setAccountName(null);
        setIsAuthenticated(false);
        setIsWalletAuth(false);
        if (isWalletAuth) {
            ethereumService.disconnect();
        }
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            accountName,
            privateKey,
            isWalletAuth,
            setCredentials,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
