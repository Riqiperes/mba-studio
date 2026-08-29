import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorsPage } from "@/pages/InstructorsPage";
import { ClassesPage } from "@/pages/ClassesPage";
import { PackagesPage } from "@/pages/PackagesPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AdminLayout>
                  <HomePage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/instructors"
            element={
              <RequireAuth>
                <AdminLayout>
                  <InstructorsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/classes"
            element={
              <RequireAuth>
                <AdminLayout>
                  <ClassesPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/packages"
            element={
              <RequireAuth>
                <AdminLayout>
                  <PackagesPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
