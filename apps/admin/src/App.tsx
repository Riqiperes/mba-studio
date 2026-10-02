import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth, RequireRole } from "@/routes/RequireAuth";
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
import { AcademyGroupDetailPage } from "@/pages/AcademyGroupDetailPage";
import { AcademyOverduePage } from "@/pages/AcademyOverduePage";
import { UsersPage } from "@/pages/UsersPage";
import { AdminInvitesPage } from "@/pages/AdminInvitesPage";
import { InstructorMyClassesPage } from "@/pages/InstructorMyClassesPage";
import { EstudioHubPage } from "@/pages/EstudioHubPage";
import { AcademiaHubPage } from "@/pages/AcademiaHubPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* RequireAuth monta AdminLayout (header, logo, nav) una sola vez
              y expone un <Outlet /> para las paginas del panel: asi el
              header no se desmonta/remonta en cada navegacion. */}
          <Route element={<RequireAuth />}>
            <Route
              path="/"
              element={
                <RequireRole>
                  <HomePage />
                </RequireRole>
              }
            />
            <Route
              path="/estudio"
              element={
                <RequireRole>
                  <EstudioHubPage />
                </RequireRole>
              }
            />
            <Route
              path="/academia"
              element={
                <RequireRole>
                  <AcademiaHubPage />
                </RequireRole>
              }
            />
            <Route
              path="/instructors"
              element={
                <RequireRole>
                  <InstructorsPage />
                </RequireRole>
              }
            />
            <Route
              path="/classes"
              element={
                <RequireRole>
                  <ClassesPage />
                </RequireRole>
              }
            />
            <Route
              path="/packages"
              element={
                <RequireRole>
                  <PackagesPage />
                </RequireRole>
              }
            />
            <Route
              path="/customers"
              element={
                <RequireRole>
                  <CustomersPage />
                </RequireRole>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <RequireRole>
                  <CustomerDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="/classes/:id"
              element={
                <RequireRole>
                  <ClassBookingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/students"
              element={
                <RequireRole>
                  <StudentsPage />
                </RequireRole>
              }
            />
            <Route
              path="/academy/groups"
              element={
                <RequireRole>
                  <AcademyGroupsPage />
                </RequireRole>
              }
            />
            <Route
              path="/academy/overdue"
              element={
                <RequireRole>
                  <AcademyOverduePage />
                </RequireRole>
              }
            />
            <Route
              path="/academy/groups/:id"
              element={
                <RequireRole>
                  <AcademyGroupDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="/users"
              element={
                <RequireRole allowedRoles={["BUSINESS_ADMIN", "SUPER_ADMIN"]}>
                  <UsersPage />
                </RequireRole>
              }
            />
            <Route
              path="/admins"
              element={
                <RequireRole allowedRoles={["SUPER_ADMIN"]}>
                  <AdminInvitesPage />
                </RequireRole>
              }
            />
            <Route
              path="/instructor/my-classes"
              element={
                <RequireRole allowedRoles={["INSTRUCTOR_ADMIN", "STAFF", "BUSINESS_ADMIN", "SUPER_ADMIN"]}>
                  <InstructorMyClassesPage />
                </RequireRole>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
