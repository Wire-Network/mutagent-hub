
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PrivateKey } from '@wireio/core';

interface AuthContextType {
    privateKey: string | null;
    accountName: string | null;
    setCredentials: (accountName: string, privateKey: string, isMetaMask?: boolean) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [accountName, setAccountName] = useState<string | null>(null);

    useEffect(() => {
        // Check for stored credentials on mount
        const storedKey = localStorage.getItem('wire_private_key');
        const storedAccount = localStorage.getItem('wire_account_name');
        if (storedKey && storedAccount) {
            setCredentials(storedAccount, storedKey);
        }
    }, []);

    const setCredentials = (account: string, key: string, isMetaMask: boolean = false) => {
        try {
            // Only validate private key format for non-MetaMask credentials
            if (!isMetaMask) {
                PrivateKey.from(key); // This will throw if invalid
            }
            
            // Store credentials
            localStorage.setItem('wire_private_key', key);
            localStorage.setItem('wire_account_name', account);
            setPrivateKey(key);
            setAccountName(account);
        } catch (error) {
            console.error('Invalid private key:', error);
            throw new Error('Invalid private key format');
        }
    };

    const logout = () => {
        localStorage.removeItem('wire_private_key');
        localStorage.removeItem('wire_account_name');
        setPrivateKey(null);
        setAccountName(null);
    };

    return (
        <AuthContext.Provider 
            value={{
                privateKey,
                accountName,
                setCredentials,
                logout,
                isAuthenticated: !!privateKey && !!accountName
            }}
        >
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
