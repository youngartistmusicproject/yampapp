import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Knowledge from "./pages/Knowledge";
import ContentHub from "./pages/ContentHub";
import Chat from "./pages/Chat";
import Community from "./pages/Community";
import Requests from "./pages/Requests";
import CalendarPage from "./pages/CalendarPage";
import CRM from "./pages/CRM";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Login from "./pages/Login";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<SetupAdmin />} />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/knowledge" element={<Knowledge />} />
                      <Route path="/content" element={<ContentHub />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/requests" element={<Requests />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="/crm" element={<CRM />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/users"
                        element={
                          <ProtectedRoute requiredRoles={['super-admin']}>
                            <UserManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
