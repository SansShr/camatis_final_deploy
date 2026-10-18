import Sidebar from "@/components/layout/Sidebar";
import RouteTable from "@/components/routes/RouteTable";

export default function RoutesPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">All Bus Routes</h1>
        <p className="text-sm text-slate-500 mb-6">
          Browse all routes — search by name, filter by status, and click any route for full details
        </p>
        <RouteTable />
      </main>
    </div>
  );
}