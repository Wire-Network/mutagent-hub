import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import Chat from '@/pages/Chat';
import Login from '@/pages/Login';
import { HeliaProvider } from './providers/HeliaProvider'

const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
                path="/" 
                element={
                    <ProtectedRoute>
                        <Index />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/chat/:personaName" 
                element={
                    <ProtectedRoute>
                        <Chat />
                    </ProtectedRoute>
                } 
            />
        </Routes>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <HeliaProvider>
                    <Router>
                        <AppRoutes />
                        <Toaster />
                    </Router>
                </HeliaProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
