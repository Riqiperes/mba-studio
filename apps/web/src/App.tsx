import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { MainLayout } from "@/layouts/MainLayout";
import { LandingPage } from "@/pages/LandingPage";
import { PackagesCatalogPage } from "@/features/packages/components/PackagesCatalog";
import { PackageDetailPage } from "@/features/packages/components/PackageDetailPage";
import { ClassesCalendarPage } from "@/features/studio/components/ClassesCalendarPage";
import { ClassDetailPage } from "@/features/studio/components/ClassDetailPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { UserProfilePage } from "@/features/auth/components/UserProfilePage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes - NO RequireAuth, NO MainLayout wrapper for individual pages */}
          <Route
            element={<MainLayout />}
          >
            <Route path="/" element={<LandingPage />} />
            <Route path="/packages" element={<PackagesCatalogPage />} />
            <Route path="/packages/:id" element={<PackageDetailPage />} />
            <Route path="/classes" element={<ClassesCalendarPage />} />
            <Route path="/classes/:id" element={<ClassDetailPage />} />
          </Route>
          
          {/* Login page - no layout */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Private routes - WITH RequireAuth + MainLayout */}
          <Route
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;