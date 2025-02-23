
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import Chat from '@/pages/Chat';
import Login from '@/pages/Login';
import About from '@/pages/About';
import { HelpButton } from '@/components/HelpButton';

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
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route 
                path="/" 
                element={
                    isAuthenticated ? (
                        <ProtectedRoute>
                            <Index />
                        </ProtectedRoute>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
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
                <Router>
                    <AppRoutes />
                    <HelpButton />
                    <Toaster />
                </Router>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
