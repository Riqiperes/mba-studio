import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorsPage } from "@/pages/InstructorsPage";
import { ClassesPage } from "@/pages/ClassesPage";
import { PackagesPage } from "@/pages/PackagesPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { StudentsPage } from "@/pages/StudentsPage";
import { ClassBookingsPage } from "@/pages/ClassBookingsPage";
import { AcademyGroupsPage } from "@/pages/AcademyGroupsPage";

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
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <AdminLayout>
                  <CustomersPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequireAuth>
                <AdminLayout>
                  <CustomerDetailPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/classes/:id"
            element={
              <RequireAuth>
                <AdminLayout>
                  <ClassBookingsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/students"
            element={
              <RequireAuth>
                <AdminLayout>
                  <StudentsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/academy/groups"
            element={
              <RequireAuth>
                <AdminLayout>
                  <AcademyGroupsPage />
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
