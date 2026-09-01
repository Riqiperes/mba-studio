import { Outlet } from "react-router-dom";
import { BottomNavigation } from "@/components/ui/BottomNavigation";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 pb-safe">
      <main id="main-content" className="pb-24">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}