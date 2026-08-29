import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorsPage } from "@/pages/InstructorsPage";

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
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/instructors"
            element={
              <RequireAuth>
                <InstructorsPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
