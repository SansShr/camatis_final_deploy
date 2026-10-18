"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getRoutes } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Search, Filter, ArrowUpDown, MapPin, Bus, TrendingUp } from "lucide-react";

interface Route {
  id: string;
  route_id: number;
  source: string;
  destination: string;
  demand: number;
  load_factor: number;
  status: string;
  buses_added: number;
  frequency_multiplier: number;
  rerouted_to: number | null;
  actions: string[];
  high_uncertainty: boolean;
  anomaly: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  "Running Fine":  "bg-green-100 text-green-700 border-green-200",
  "Watch Closely": "bg-orange-100 text-orange-700 border-orange-200",
  "Needs Review":  "bg-red-100 text-red-700 border-red-200",
};

type SortKey = "id" | "demand" | "load_factor" | "buses_added";

export default function RouteTable() {
  const router = useRouter();
  const [routes,  setRoutes]  = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    getRoutes().then((data) => {
      setRoutes(data as Route[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let out = routes;

    // Search: route id, source, destination
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "All") {
      out = out.filter(r => r.status === statusFilter);
    }

    // Sort
    out = [...out].sort((a, b) => {
      let va: any = sortKey === "id" ? a.route_id : a[sortKey];
      let vb: any = sortKey === "id" ? b.route_id : b[sortKey];
      return sortAsc ? va - vb : vb - va;
    });

    return out;
  }, [routes, search, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
      onClick={() => toggleSort(k)}
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === k ? "text-blue-600" : "text-slate-400"} />
    </button>
  );

  const total   = routes.length;
  const running = routes.filter(r => r.status === "Running Fine").length;
  const watch   = routes.filter(r => r.status === "Watch Closely").length;
  const review  = routes.filter(r => r.status === "Needs Review").length;

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700">
          {total} routes total
        </div>
        <div className="px-4 py-2 bg-green-100 rounded-xl text-sm font-semibold text-green-700">
          ✓ {running} running fine
        </div>
        <div className="px-4 py-2 bg-orange-100 rounded-xl text-sm font-semibold text-orange-700">
          ⚠ {watch} watch closely
        </div>
        {review > 0 && (
          <div className="px-4 py-2 bg-red-100 rounded-xl text-sm font-semibold text-red-700">
            🔍 {review} need review
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by route, source or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {["All", "Running Fine", "Watch Closely", "Needs Review"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Result count */}
        <span className="text-xs text-slate-400 ml-auto">
          Showing {filtered.length} of {total}
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-20"><SortBtn k="id" label="Route" /></TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-green-600" /> From
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-red-500" /> To
                    </div>
                  </TableHead>
                  <TableHead><SortBtn k="demand"      label="Daily Passengers" /></TableHead>
                  <TableHead><SortBtn k="load_factor" label="How Full" /></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><SortBtn k="buses_added" label="Extra Buses Needed" /></TableHead>
                  <TableHead>Overflow Route</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((route) => (
                  <TableRow
                    key={route.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => router.push(`/routes/${encodeURIComponent(route.id)}`)}
                  >
                    <TableCell className="font-bold text-blue-600">{route.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-sm text-slate-700">{route.source || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-sm text-slate-700">{route.destination || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={12} className={route.demand > 350 ? "text-red-500" : "text-slate-400"} />
                        <span className={`font-medium ${route.demand > 350 ? "text-red-600" : "text-slate-700"}`}>
                          {Math.round(route.demand).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              route.load_factor > 15 ? "bg-red-500" :
                              route.load_factor > 10 ? "bg-orange-400" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, (route.load_factor / 22) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">{route.load_factor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[route.status] ?? STATUS_COLORS["Running Fine"]}`}>
                        {route.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {route.buses_added > 0
                        ? <span className="flex items-center gap-1 text-green-600 font-semibold text-sm"><Bus size={12} />+{route.buses_added} buses</span>
                        : <span className="text-slate-400 text-sm">None needed</span>}
                    </TableCell>
                    <TableCell>
                      {route.rerouted_to
                        ? <span className="text-orange-600 font-semibold text-sm" title="Some buses sent to this route to balance passengers">→ R-{route.rerouted_to}</span>
                        : <span className="text-slate-400 text-sm">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-10">
                      No routes match your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-xs text-slate-500 px-1 pt-1">
        <span><span className="font-semibold text-green-600">Extra Buses Needed:</span> How many more buses the system recommends adding to handle passenger demand on that route</span>
        <span><span className="font-semibold text-orange-600">Overflow Route:</span> This route is too crowded — some of its passengers are redirected to this alternate route nearby</span>
      </div>
    </div>
  );
}
