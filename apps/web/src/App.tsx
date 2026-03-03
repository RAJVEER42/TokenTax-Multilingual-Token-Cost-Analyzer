import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/Layout";

// Eager-loaded core pages
import DashboardPage from "@/pages/DashboardPage";
import AnalyzePage from "@/pages/AnalyzePage";

// Lazy-loaded educational & reference pages (performance: <1s load)
const LearnPage = lazy(() => import("@/pages/LearnPage"));
const ResearchPage = lazy(() => import("@/pages/ResearchPage"));
const FAQPage = lazy(() => import("@/pages/FAQPage"));
const GlitchTokensPage = lazy(() => import("@/pages/GlitchTokensPage"));
const SharePage = lazy(() => import("@/pages/SharePage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route
              path="/learn"
              element={<Suspense fallback={<PageLoader />}><LearnPage /></Suspense>}
            />
            <Route
              path="/research"
              element={<Suspense fallback={<PageLoader />}><ResearchPage /></Suspense>}
            />
            <Route
              path="/faq"
              element={<Suspense fallback={<PageLoader />}><FAQPage /></Suspense>}
            />
            <Route
              path="/glitch-tokens"
              element={<Suspense fallback={<PageLoader />}><GlitchTokensPage /></Suspense>}
            />
            <Route
              path="/share/:id"
              element={<Suspense fallback={<PageLoader />}><SharePage /></Suspense>}
            />
            <Route
              path="/pricing"
              element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>}
            />
            <Route
              path="/about"
              element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
