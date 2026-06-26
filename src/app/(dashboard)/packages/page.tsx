"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { mockDb } from "@/lib/supabase";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import { Package, PackageStatus } from "@/types";
import { Search, Compass, ShieldAlert, CheckCircle, Scale, Eye, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TabFilter = "all" | PackageStatus;

export default function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  useEffect(() => {
    async function fetchPackages() {
      try {
        let pkgs: Package[] = [];
        if (isRealSupabaseActive) {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          
          if (userId) {
            const { data: dbPkgs, error: dbError } = await supabase
              .from("packages")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });

            if (!dbError && dbPkgs) {
              pkgs = dbPkgs.map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                trackingNumber: p.tracking_number,
                vendor: p.vendor,
                description: p.description,
                weight: Number(p.weight || 0),
                shippingMode: p.shipping_mode,
                status: p.status,
                miamiReceivedAt: p.miami_received_at,
                sjoArrivedAt: p.sjo_arrived_at,
                deliveredAt: p.delivered_at,
                createdAt: p.created_at,
                wantsDelivery: p.wants_delivery !== false,
                wantsInsurance: p.wants_insurance !== false
              }));
            }
          }
        } else {
          pkgs = await mockDb.packages.select();
          if (user) {
            pkgs = pkgs.filter(p => p.userId === user.id);
          }
        }
        setPackages(pkgs);
      } catch (err) {
        console.error("Error loading packages", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  // Filter packages by search query and active filter tabs
  const filteredPackages = useMemo(() => {
    return packages.filter(p => {
      const matchesSearch = 
        p.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.vendor.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      
      const matchesTab = activeTab === "all" || p.status === activeTab;
      
      return matchesSearch && matchesTab;
    });
  }, [packages, search, activeTab]);

  const handleDeleteClientPackage = async (packageId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta prealerta? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      setLoading(true);
      if (isRealSupabaseActive) {
        const { error } = await supabase
          .from("packages")
          .delete()
          .eq("id", packageId)
          .eq("status", "prealerted"); // Solamente permitir eliminar prealertados por seguridad

        if (error) {
          throw new Error(error.message);
        }
      } else {
        await mockDb.packages.delete(packageId);
      }
      
      alert("¡Prealerta eliminada correctamente!");
      setPackages((prev) => prev.filter((p) => p.id !== packageId));
    } catch (err: any) {
      alert("Error al eliminar la prealerta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ key: TabFilter; label: string }> = [
    { key: "all", label: "Todos" },
    { key: "prealerted", label: "Prealertas" },
    { key: "received", label: "En Miami" },
    { key: "in_transit", label: "En Vuelo" },
    { key: "delivered", label: "Entregados" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white">Catálogo de Mis Paquetes</h1>
          <p className="text-slate-400 text-xs mt-1">Busca y audita todos tus fletes aéreos y prealertas activas.</p>
        </div>
        <Link href="/prealerts">
          <Button size="sm" className="rounded-xl flex items-center gap-1 text-xs font-bold font-heading uppercase tracking-wider">
            <Plus className="h-4 w-4" />
            Nueva Prealerta
          </Button>
        </Link>
      </div>

      {/* Tabs Filter Row */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all font-semibold select-none ${
              activeTab === tab.key
                ? "bg-brand-cyan/15 text-brand-cyan font-bold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Filtrar por vendedor, tracking o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 text-xs"
        />
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Sincronizando casillero...</div>
      ) : filteredPackages.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-transparent py-16 text-center space-y-4">
          <div className="h-12 w-12 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No se encontraron paquetes</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2 leading-relaxed">
              No hay envíos registrados bajo este criterio. Registra una nueva prealerta comercial para iniciar.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id} className="hover:border-brand-cyan/20 transition-all leading-relaxed">
              <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-lg">
                    {pkg.trackingNumber}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase inline-block leading-none ${
                    pkg.shippingMode === "sea" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {pkg.shippingMode === "sea" ? "🚢 Marítimo" : "✈️ Aéreo"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase inline-block leading-none ${
                    pkg.wantsDelivery !== false ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                  }`}>
                    {pkg.wantsDelivery !== false ? "🚚 A Domicilio" : "🏢 Retiro Sucursal"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase inline-block leading-none ${
                    pkg.wantsInsurance !== false ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {pkg.wantsInsurance !== false ? "🛡️ Con Seguro" : "⚠️ Sin Seguro"}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-md font-bold font-heading text-[8px] uppercase tracking-wider ${
                  pkg.status === "prealerted" && "bg-white/5 text-slate-400"
                } ${
                  pkg.status === "received" && "bg-brand-orange/15 text-brand-orange"
                } ${
                  (pkg.status === "in_transit" || pkg.status === "customs" || pkg.status === "out_for_delivery") && "bg-brand-teal/20 text-brand-cyan"
                } ${
                  pkg.status === "delivered" && "bg-green-500/15 text-green-400"
                }`}>
                  {pkg.status.replace(/_/g, ' ')}
                </span>
              </CardHeader>
              <CardContent className="py-4 space-y-3">
                <div className="space-y-1">
                  <strong className="text-sm text-white block font-bold leading-snug">{pkg.description}</strong>
                  <span className="text-[10px] text-slate-400">Tienda: {pkg.vendor}</span>
                </div>
                
                {pkg.weight > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-[#0b0f19] px-2.5 py-1 rounded-lg w-max">
                    <Scale className="h-3.5 w-3.5 text-brand-cyan" />
                    {pkg.shippingMode === "sea" ? `Volumen: ${pkg.weight} CFT` : `Peso: ${pkg.weight} Kg`}
                  </div>
                )}
                {pkg.wantsInsurance === false && (
                  <div className="p-2.5 border border-red-500/10 bg-red-500/5 rounded-xl text-red-400 text-[10px] leading-normal">
                    ⚠️ <strong>Sin seguro:</strong> BreezeGo no se hace responsable por daños o pérdidas de este paquete.
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-4 flex justify-end gap-2 border-t border-white/5 pt-3 mt-1">
                {pkg.status === "prealerted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClientPackage(pkg.id)}
                    className="h-8 text-[10px] font-heading font-extrabold uppercase tracking-wider text-red-400 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                )}
                <Link href={`/tracking?code=${encodeURIComponent(pkg.trackingNumber)}`}>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] font-heading font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-brand-cyan" />
                    Auditar Tracker
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
