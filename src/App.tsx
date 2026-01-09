import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/*"
            element={
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
