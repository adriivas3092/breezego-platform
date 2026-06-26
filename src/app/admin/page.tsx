"use client";

import React, { useEffect, useState } from "react";
import { mockDb } from "@/lib/supabase";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";
import { Package, PackageStatus, User, Invoice, BusinessSettings } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { 
  Shield, 
  Scale, 
  MapPin, 
  Truck, 
  RefreshCw, 
  CheckCircle2, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Users, 
  FileSpreadsheet, 
  Compass, 
  Send,
  DollarSign,
  Settings,
  Edit,
  Save,
  Plus,
  Search,
  Check,
  X,
  Lock,
  LogOut,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Printer,
  Mail
} from "lucide-react";

type TabType = "overview" | "users" | "packages" | "tracking" | "billing" | "settings";

export default function IndependentAdminPage() {
  // Authentication & Lock State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  
  // Database States
  const [packages, setPackages] = useState<Package[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Search queries
  const [searchPkgQuery, setSearchPkgQuery] = useState("");
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [searchInvQuery, setSearchInvQuery] = useState("");
  
  // Package Operator Form State
  const [selectedPkgId, setSelectedPkgId] = useState<string>("");
  const [pkgWeight, setPkgWeight] = useState<number>(0);
  const [pkgWeightUnit, setPkgWeightUnit] = useState<"kgs" | "lbs" | "g">("kgs");
  const [pkgWeightInputVal, setPkgWeightInputVal] = useState<string>("0");

  const convertWeight = (val: number, fromUnit: string, toUnit: string): number => {
    let kgs = val;
    if (fromUnit === "lbs") {
      kgs = val / 2.20462;
    } else if (fromUnit === "g") {
      kgs = val * 0.001;
    }
    
    if (toUnit === "lbs") {
      return kgs * 2.20462;
    } else if (toUnit === "g") {
      return kgs * 1000;
    }
    return kgs;
  };
  const [pkgStatus, setPkgStatus] = useState<PackageStatus>("prealerted");
  const [pkgShippingMode, setPkgShippingMode] = useState<string>("air");
  const [pkgDeclaredValue, setPkgDeclaredValue] = useState<string>("0.00");
  const [pkgCategory, setPkgCategory] = useState<string>("general");
  const [pkgUserId, setPkgUserId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [gpsLat, setGpsLat] = useState<number>(9.9347);
  const [gpsLon, setGpsLon] = useState<number>(-84.0308);
  const [driverName, setDriverName] = useState("Eduardo Mora");
  const [driverPhone, setDriverPhone] = useState("+506 7011-8910");
  
  // Manual Tracking Form States
  const [trackUserId, setTrackUserId] = useState("");
  const [trackTrackingNumber, setTrackTrackingNumber] = useState("");
  const [trackVendor, setTrackVendor] = useState("");
  const [trackDescription, setTrackDescription] = useState("");
  const [trackWeight, setTrackWeight] = useState(0.0);
  const [trackWeightUnit, setTrackWeightUnit] = useState<"kgs" | "lbs" | "g">("kgs");
  const [trackWeightInputVal, setTrackWeightInputVal] = useState<string>("0");
  const [trackStatus, setTrackStatus] = useState<PackageStatus>("received"); // Bodegaje Miami by default
  const [trackShippingMode, setTrackShippingMode] = useState<string>("air");
  const [trackDriverName, setTrackDriverName] = useState("Eduardo Mora");
  const [trackDriverPhone, setTrackDriverPhone] = useState("+506 7011-8910");
  const [isRegisteringPkg, setIsRegisteringPkg] = useState(false);
  
  // User Editing Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userIdCard, setUserIdCard] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [userDeliveryMethod, setUserDeliveryMethod] = useState<"gam" | "rural" | "locker">("gam");
  const [userSpeedPreference, setUserSpeedPreference] = useState<"standard" | "express">("standard");

  // User Creating Form State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIdCard, setNewIdCard] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Business Settings Form State
  const [miamiLaunchRate, setMiamiLaunchRate] = useState(6000);
  const [miamiRegularRate, setMiamiRegularRate] = useState(7000);
  const [deliveryGamFee, setDeliveryGamFee] = useState(3500);
  const [deliveryCartagoAlajuelaFee, setDeliveryCartagoAlajuelaFee] = useState(4500);
  const [deliveryRuralFee, setDeliveryRuralFee] = useState(5000);
  const [boxMediumFee, setBoxMediumFee] = useState(15.00);
  const [boxLargeFee, setBoxLargeFee] = useState(20.00);
  const [boxXlargeFee, setBoxXlargeFee] = useState(25.00);
  const [boxMediumFeeRegular, setBoxMediumFeeRegular] = useState(18.00);
  const [boxLargeFeeRegular, setBoxLargeFeeRegular] = useState(23.00);
  const [boxXlargeFeeRegular, setBoxXlargeFeeRegular] = useState(28.00);

  // Stats Counters
  const [customsCount, setCustomsCount] = useState(0);
  const [repartoCount, setRepartoCount] = useState(0);
  const [paidRevenue, setPaidRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);

  // Check Authorization on Load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("breezego_admin_authorized");
      if (auth === "true") {
        setIsAuthorized(true);
        fetchData();
      }
      setCheckingAuth(false);
    }
  }, []);

  // Sincronización en tiempo real: consulta de fondo cada 10 segundos si está autorizado
  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthorized]);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthorized(true);
        sessionStorage.setItem("breezego_admin_authorized", "true");
        sessionStorage.setItem("breezego_admin_passcode", passwordInput);
        setAuthError("");
        fetchData();
      } else {
        setAuthError(data.error || "Clave de seguridad master incorrecta.");
      }
    } catch (err) {
      setAuthError("Error de conexión al servidor de autorización.");
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLockConsole = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem("breezego_admin_authorized");
    sessionStorage.removeItem("breezego_admin_passcode");
    setPasswordInput("");
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch packages (real sync from Supabase database)
      const adminPasscode = sessionStorage.getItem("breezego_admin_passcode") || "";
      let activePkgs: Package[] = [];
      let activeInvs: Invoice[] = [];
      
      try {
        const resPkgs = await fetch("/api/admin/packages", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${adminPasscode}`
          }
        });
        const resPkgsData = await resPkgs.json();
        if (resPkgs.ok && resPkgsData.success) {
          activePkgs = resPkgsData.packages;
          setPackages(activePkgs);
          
          // Default package selection for operations (only on initial load)
          if (activePkgs.length > 0 && !selectedPkgId && !silent) {
            handleSelectPackage(activePkgs[0]);
          }
        } else if (packages.length === 0) {
          activePkgs = await mockDb.packages.select();
          setPackages(activePkgs);
          if (activePkgs.length > 0 && !selectedPkgId && !silent) {
            handleSelectPackage(activePkgs[0]);
          }
        } else {
          activePkgs = packages;
        }
      } catch (err) {
        console.error("Error al obtener paquetes de Supabase, cayendo en mockDb...", err);
        if (packages.length === 0) {
          activePkgs = await mockDb.packages.select();
          setPackages(activePkgs);
          if (activePkgs.length > 0 && !selectedPkgId && !silent) {
            handleSelectPackage(activePkgs[0]);
          }
        } else {
          activePkgs = packages;
        }
      }
      
      // Fetch users (real sync from Supabase database or server administration)
      try {
        const resUsers = await fetch("/api/admin/users", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${adminPasscode}`
          }
        });
        const resUsersData = await resUsers.json();
        if (resUsers.ok && resUsersData.success) {
          setUsers(resUsersData.users);
        } else if (users.length === 0) {
          const mockUsers = await mockDb.users.select();
          setUsers(mockUsers);
        }
      } catch (err) {
        console.error("Error al obtener usuarios reales de Supabase, cayendo en mockDb...", err);
        if (users.length === 0) {
          const mockUsers = await mockDb.users.select();
          setUsers(mockUsers);
        }
      }
      
      // Fetch invoices
      if (isRealSupabaseActive) {
        const { data: dbInvs, error: dbInvsError } = await supabase
          .from("invoices")
          .select("*");
        if (!dbInvsError && dbInvs) {
          activeInvs = dbInvs.map((inv: any) => ({
            id: inv.id,
            packageId: inv.package_id,
            fleteCost: Number(inv.flete_cost || 0),
            taxesCost: Number(inv.taxes_cost || 0),
            deliveryCost: Number(inv.delivery_cost || 0),
            totalCostUsd: Number(inv.total_cost_usd || 0),
            totalCostCrc: Number(inv.total_cost_crc || 0),
            isPaid: inv.is_paid,
            createdAt: inv.created_at
          }));
          setInvoices(activeInvs);
        } else if (invoices.length === 0) {
          activeInvs = await mockDb.invoices.select();
          setInvoices(activeInvs);
        } else {
          activeInvs = invoices;
        }
      } else {
        if (invoices.length === 0) {
          activeInvs = await mockDb.invoices.select();
          setInvoices(activeInvs);
        } else {
          activeInvs = invoices;
        }
      }
      
      // Fetch settings
      const settingsData = await mockDb.settings.get();
      setSettings(settingsData);
      
      // Load settings fields
      setMiamiLaunchRate(settingsData.miamiLaunchRate);
      setMiamiRegularRate(settingsData.miamiRegularRate);
      setDeliveryGamFee(settingsData.deliveryGamFee);
      setDeliveryCartagoAlajuelaFee(settingsData.deliveryCartagoAlajuelaFee);
      setDeliveryRuralFee(settingsData.deliveryRuralFee);
      setBoxMediumFee(settingsData.boxMediumFee);
      setBoxLargeFee(settingsData.boxLargeFee);
      setBoxXlargeFee(settingsData.boxXlargeFee);
      setBoxMediumFeeRegular(settingsData.boxMediumFeeRegular);
      setBoxLargeFeeRegular(settingsData.boxLargeFeeRegular);
      setBoxXlargeFeeRegular(settingsData.boxXlargeFeeRegular);
 
      // Compute Stats on active arrays to avoid React state batching delays
      setCustomsCount(activePkgs.filter(p => p.status === "customs").length);
      setRepartoCount(activePkgs.filter(p => p.status === "out_for_delivery").length);
      
      // Revenue
      const paid = activeInvs.filter(i => i.isPaid).reduce((acc, curr) => acc + curr.totalCostUsd, 0);
      const pending = activeInvs.filter(i => !i.isPaid).reduce((acc, curr) => acc + curr.totalCostUsd, 0);
      setPaidRevenue(Number(paid.toFixed(2)));
      setPendingRevenue(Number(pending.toFixed(2)));
    } catch (err) {
      console.error("Error loading master console data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPkgId(pkg.id);
    setPkgWeight(pkg.weight || 0);
    setPkgWeightInputVal((pkg.weight || 0).toString());
    setPkgWeightUnit("kgs");
    setPkgStatus(pkg.status || "prealerted");
    setPkgShippingMode(pkg.shippingMode || "air");
    setPkgDeclaredValue(String(pkg.declaredValue || 0));
    setPkgCategory(pkg.category || "general");
    setPkgUserId(pkg.userId || "");

    // Smooth scroll to operations panel on mobile/small viewports
    setTimeout(() => {
      const element = document.getElementById("shipping-operation-panel");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const selectedPkg = packages.find(p => p.id === selectedPkgId);
  const selectedUser = users.find(u => u.id === editingUserId);

  // Update Package Status & Dispatch WhatsApp Notification
  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkgId || !selectedPkg) return;
    
    setSaving(true);
    try {
      const adminPasscode = sessionStorage.getItem("breezego_admin_passcode") || "";
      const resUpdate = await fetch("/api/admin/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminPasscode}`
        },
        body: JSON.stringify({
          id: selectedPkgId,
          userId: pkgUserId || null,
          trackingNumber: selectedPkg.trackingNumber,
          vendor: selectedPkg.vendor,
          description: selectedPkg.description,
          weight: pkgWeight,
          status: pkgStatus,
          shippingMode: pkgShippingMode,
          declaredValue: Number(pkgDeclaredValue || 0),
          category: pkgCategory,
          invoiceUrl: selectedPkg.invoiceUrl || undefined,
          driverName: pkgStatus === "out_for_delivery" ? driverName : undefined,
          driverPlate: pkgStatus === "out_for_delivery" ? "Camioneta #14" : undefined,
          driverPhone: pkgStatus === "out_for_delivery" ? driverPhone : undefined
        })
      });
      const resUpdateData = await resUpdate.json();
      
      if (!resUpdate.ok || !resUpdateData.success) {
        throw new Error(resUpdateData.error || "Error al actualizar en el servidor.");
      }
      
      const updated = resUpdateData.package;
      
      if (updated) {
        // Trigger Email Notification dispatch
        try {
          const client = users.find(u => u.id === pkgUserId) || { fullName: "Cliente BreezeGo", phone: "+506 8899-4455" };
          
          const resNotify = await fetch("/api/notifications/whatsapp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-passcode": sessionStorage.getItem("breezego_admin_passcode") || ""
            },
            body: JSON.stringify({
              packageId: selectedPkgId,
              trackingNumber: selectedPkg.trackingNumber,
              status: pkgStatus,
              clientName: client.fullName,
              clientPhone: client.phone,
              details: {
                weight: pkgWeight,
                driverName: driverName,
                driverPhone: driverPhone
              }
            })
          });
          const notifyData = await resNotify.json();
          if (notifyData.success) {
            alert(`¡Estado de envío guardado!\n\nNotificación por correo electrónico enviada a ${client.fullName}`);
          }
        } catch (notifyErr) {
          console.error("Failed to trigger notification", notifyErr);
          alert("¡Estado de envío guardado! (Servicio de notificaciones offline)");
        }
        fetchData();
      }
    } catch (err) {
      alert("Error al actualizar estado de envío.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este paquete? Esta acción no se puede deshacer.")) {
      return;
    }
    
    setSaving(true);
    try {
      const adminPasscode = sessionStorage.getItem("breezego_admin_passcode") || "";
      const res = await fetch(`/api/admin/packages?id=${packageId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminPasscode}`
        }
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Error al eliminar el paquete en el servidor.");
      }
      alert("¡Paquete eliminado exitosamente!");
      setSelectedPkgId("");
      fetchData();
    } catch (err: any) {
      alert("Error al eliminar paquete: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAcs = async () => {
    setIsSyncing(true);
    try {
      const adminPasscode = sessionStorage.getItem("breezego_admin_passcode") || "";
      const res = await fetch("/api/admin/packages/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminPasscode}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al sincronizar con el servidor.");
      }
      const { updated, autoRegistered, unassigned } = data.summary;
      alert(`Sincronización con ACS Logística exitosa:\n\n` +
            `• Paquetes actualizados (cambio estado/peso): ${updated}\n` +
            `• Paquetes auto-registrados y asociados a clientes: ${autoRegistered}\n` +
            `• Paquetes nuevos sin asignar (huérfanos): ${unassigned}`);
      fetchData();
    } catch (err: any) {
      alert("Error al sincronizar con ACS Logística: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual package registration / tracking
  const handleRegisterPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackUserId || !trackTrackingNumber || !trackVendor || !trackDescription) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }
    
    setIsRegisteringPkg(true);
    try {
      const adminPasscode = sessionStorage.getItem("breezego_admin_passcode") || "";
      const resRegister = await fetch("/api/admin/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminPasscode}`
        },
        body: JSON.stringify({
          userId: trackUserId,
          trackingNumber: trackTrackingNumber,
          vendor: trackVendor,
          description: trackDescription,
          weight: trackWeight,
          status: trackStatus,
          shippingMode: trackShippingMode,
          driverName: trackStatus === "out_for_delivery" ? trackDriverName : undefined,
          driverPlate: trackStatus === "out_for_delivery" ? "Camioneta #14" : undefined,
          driverPhone: trackStatus === "out_for_delivery" ? trackDriverPhone : undefined
        })
      });
      
      const resRegisterData = await resRegister.json();
      
      if (!resRegister.ok || !resRegisterData.success) {
        throw new Error(resRegisterData.error || "Error al registrar paquete en el servidor.");
      }
      
      const registered = resRegisterData.package;
      
      if (registered) {
        // Trigger Email Notification dispatch
        try {
          const client = users.find(u => u.id === trackUserId) || { fullName: "Cliente BreezeGo", phone: "+506 8899-4455" };
          
          const resNotify = await fetch("/api/notifications/whatsapp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-passcode": sessionStorage.getItem("breezego_admin_passcode") || ""
            },
            body: JSON.stringify({
              packageId: registered.id,
              trackingNumber: trackTrackingNumber,
              status: trackStatus,
              clientName: client.fullName,
              clientPhone: client.phone,
              details: {
                weight: trackWeight,
                driverName: trackDriverName,
                driverPhone: trackDriverPhone
              }
            })
          });
          const notifyData = await resNotify.json();
          if (notifyData.success) {
            alert(`¡Paquete registrado exitosamente!\n\nNotificación por correo electrónico enviada a ${client.fullName}`);
          } else {
            alert("¡Paquete registrado exitosamente!");
          }
        } catch (notifyErr) {
          console.error("Failed to trigger notification", notifyErr);
          alert("¡Paquete registrado exitosamente! (Servicio de notificaciones offline)");
        }
        
        // Reset form
        setTrackTrackingNumber("");
        setTrackVendor("");
        setTrackDescription("");
        setTrackWeight(0.0);
        setTrackWeightInputVal("0");
        setTrackWeightUnit("kgs");
        setTrackStatus("received");
        setTrackShippingMode("air");
        
        fetchData();
      }
    } catch (err: any) {
      alert("Error al registrar paquete: " + err.message);
    } finally {
      setIsRegisteringPkg(false);
    }
  };

  // User Edit Actions
  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserFullName(user.fullName);
    setUserLastName(user.lastName || "");
    setUserPhone(user.phone);
    setUserIdCard(user.idCard);
    setUserAddress(user.address);
    setUserDeliveryMethod(user.deliveryMethod);
    setUserSpeedPreference(user.speedPreference);

    // Smooth scroll to CRM form panel on mobile/small viewports
    setTimeout(() => {
      const element = document.getElementById("crm-client-form-panel");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    if (!userLastName.trim()) {
      alert("El apellido es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      if (isRealSupabaseActive) {
        const passcode = sessionStorage.getItem("breezego_admin_passcode") || "";
        const res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${passcode}`
          },
          body: JSON.stringify({
            id: editingUserId,
            fullName: userFullName,
            lastName: userLastName,
            phone: userPhone,
            idCard: userIdCard,
            address: userAddress,
            deliveryMethod: userDeliveryMethod,
            speedPreference: userSpeedPreference
          })
        });

        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || "Error al actualizar en el servidor.");
        }
      }

      const updated = await mockDb.users.update(editingUserId, {
        fullName: userFullName,
        lastName: userLastName,
        phone: userPhone,
        idCard: userIdCard,
        address: userAddress,
        deliveryMethod: userDeliveryMethod,
        speedPreference: userSpeedPreference
      });
      if (updated) {
        alert("¡Ficha de cliente actualizada con éxito!");
        setEditingUserId(null);
        setUserLastName("");
        fetchData();
      }
    } catch (err: any) {
      alert("Error al actualizar cliente: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer. Se eliminará el casillero y se reiniciarán todos sus paquetes y cuentas por cobrar asociadas.")) return;
    setSaving(true);
    try {
      // 1. Delete from Supabase Database and Auth via API
      const passcode = sessionStorage.getItem("breezego_admin_passcode") || "";
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${passcode}`
        }
      });
      const resData = await res.json();
      
      // 2. Also clear from local storage fallback
      await mockDb.users.delete(userId);
      
      if (res.ok && resData.success) {
        alert("¡Cliente y todos sus datos relacionados eliminados con éxito!");
        setEditingUserId(null);
        fetchData();
      } else {
        // Fallback or warning
        alert("¡Cliente eliminado de local! Nota: " + (resData.error || "No se pudo sincronizar el borrado remoto en Supabase."));
        setEditingUserId(null);
        fetchData();
      }
    } catch (err) {
      alert("Error al eliminar cliente.");
    } finally {
      setSaving(false);
    }
  };

  // User Creation Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLastName.trim()) {
      alert("El apellido es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      let nextNum = 1;
      if (users.length > 0) {
        const nums = users.map(u => {
          const match = u.suiteCode.match(/(?:BZG|BRG|BEZG)-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const finalSuiteCode = `BEZG-${String(nextNum).padStart(3, "0")}`;
      let createdUserId = `user_gen_${Math.random().toString(36).substr(2, 9)}`;
      let serverSuiteCode = finalSuiteCode;

      if (isRealSupabaseActive) {
        const passcode = sessionStorage.getItem("breezego_admin_passcode") || "";
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${passcode}`
          },
          body: JSON.stringify({
            email: newEmail,
            fullName: newFullName,
            lastName: newLastName,
            phone: newPhone,
            idCard: newIdCard,
            address: newAddress,
            deliveryMethod: "gam",
            speedPreference: "standard",
            suiteCode: finalSuiteCode
          })
        });

        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || "Error al crear cliente en el servidor.");
        }
        
        createdUserId = resData.user.id;
        serverSuiteCode = resData.user.suiteCode || finalSuiteCode;
      }

      const newUser = await mockDb.users.update(createdUserId, {
        email: newEmail,
        fullName: newFullName,
        lastName: newLastName,
        phone: newPhone,
        idCard: newIdCard,
        address: newAddress,
        deliveryMethod: "gam",
        speedPreference: "standard",
        suiteCode: serverSuiteCode
      });
      if (newUser) {
        alert(`¡Cliente creado exitosamente!\n\nSuite Miami Asignada: ${newUser.suiteCode}`);
        setIsCreatingUser(false);
        setNewEmail("");
        setNewFullName("");
        setNewLastName("");
        setNewPhone("");
        setNewIdCard("");
        setNewAddress("");
        fetchData();
      }
    } catch (err: any) {
      alert("Error al crear cliente: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Invoice Manual Payment Toggles
  const handleToggleInvoicePayment = async (invId: string, currentPaid: boolean) => {
    try {
      if (isRealSupabaseActive) {
        const { error } = await supabase
          .from("invoices")
          .update({ is_paid: !currentPaid })
          .eq("id", invId);
        if (error) throw error;
        alert(`Factura marcada como ${!currentPaid ? "PAGADA" : "PENDIENTE DE PAGO"}`);
        fetchData();
      } else {
        const success = await mockDb.invoices.updatePaidStatus(invId, !currentPaid);
        if (success) {
          alert(`Factura marcada como ${!currentPaid ? "PAGADA" : "PENDIENTE DE PAGO"}`);
          fetchData();
        }
      }
    } catch (err) {
      alert("Error al actualizar estado de la factura.");
    }
  };

  // Master Settings/Tariffs Update
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await mockDb.settings.update({
        miamiLaunchRate,
        miamiRegularRate,
        deliveryGamFee,
        deliveryCartagoAlajuelaFee,
        deliveryRuralFee,
        boxMediumFee,
        boxLargeFee,
        boxXlargeFee,
        boxMediumFeeRegular,
        boxLargeFeeRegular,
        boxXlargeFeeRegular
      });
      if (updated) {
        alert("¡Tarifas actualizadas en vivo! Todos los cálculos del sitio web y calculadora ahora consumirán estos valores.");
        fetchData();
      }
    } catch (err) {
      alert("Error al actualizar configuración de tarifas.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to resolve client name from userId
  const getClientName = (userId: string | null | undefined) => {
    if (!userId) return "⚠️ Sin Asignar";
    const matched = users.find(u => u.id === userId);
    return matched ? `${matched.fullName} ${matched.lastName || ""}`.trim() : "Cliente BreezeGo";
  };

  // Helper to resolve client suite from userId
  const getClientSuite = (userId: string | null | undefined) => {
    if (!userId) return "SIN SUITE";
    const matched = users.find(u => u.id === userId);
    return matched ? matched.suiteCode : "BZ-MIA";
  };

  // Helper to resolve client phone from userId
  const getClientPhone = (userId: string) => {
    const matched = users.find(u => u.id === userId);
    return matched ? matched.phone : "";
  };

  // Payment Link states
  const [generatingLinkInvId, setGeneratingLinkInvId] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

  const handleGeneratePaymentLink = async (invId: string) => {
    const matchedInv = invoices.find(i => i.id === invId);
    if (!matchedInv) return;

    setGeneratingLinkInvId(invId);
    try {
      let token = "";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || "";
      } catch (e) {}

      const response = await fetch("/api/payments/tilopay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: invId,
          amountUsd: matchedInv.totalCostUsd,
          amountCrc: matchedInv.totalCostCrc
        })
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        const absoluteUrl = data.redirectUrl.startsWith("http")
          ? data.redirectUrl
          : `${window.location.origin}${data.redirectUrl}`;

        setGeneratedLinks(prev => ({
          ...prev,
          [invId]: absoluteUrl
        }));
      } else {
        alert("Error al generar enlace de pago: " + (data.error || "Error desconocido."));
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al generar enlace de pago.");
    } finally {
      setGeneratingLinkInvId(null);
    }
  };

  // Helper to generate dynamic WhatsApp template preview text
  const getWhatsAppPreviewText = () => {
    if (!selectedPkg) return "Seleccione un paquete para ver la previsualización del mensaje...";
    
    const clientName = getClientName(selectedPkg.userId);
    const tracking = selectedPkg.trackingNumber;
    let statusText = "";
    let icon = "📦";
    
    switch (pkgStatus) {
      case "prealerted":
        statusText = "Prealertado";
        icon = "⚡";
        break;
      case "received":
        statusText = "Listo en Miami";
        icon = "📦";
        break;
      case "in_transit":
        statusText = "En Tránsito a Costa Rica";
        icon = "✈️";
        break;
      case "customs":
        statusText = "En Aduana Costa Rica";
        icon = "🏛️";
        break;
      case "out_for_delivery":
        statusText = "En Reparto Local";
        icon = "🚚";
        break;
      case "delivered":
        statusText = "Entregado con éxito";
        icon = "🎉";
        break;
    }
    
    const trackerLink = `https://breezego-landing.vercel.app/tracking?code=${tracking}`;
    
    const isSea = selectedPkg.shippingMode === "sea";
    const unitLabel = isSea ? "CFT" : "Kg";
    const propName = isSea ? "Volumen" : "Peso";
    return `¡Hola ${clientName}! 🌟 Tu paquete de BreezeGo *${tracking}* cambió de estado a: *${icon} ${statusText}*. ${propName}: ${pkgWeight || selectedPkg.weight} ${unitLabel}. Sigue la ruta en vivo aquí: ${trackerLink}`;
  };

  // Filtering Lists
  const filteredPackages = packages.filter(pkg => 
    pkg.trackingNumber.toLowerCase().includes(searchPkgQuery.toLowerCase()) ||
    pkg.description.toLowerCase().includes(searchPkgQuery.toLowerCase()) ||
    getClientName(pkg.userId).toLowerCase().includes(searchPkgQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    (u.lastName || "").toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.suiteCode.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const filteredInvoices = invoices.filter(inv => {
    const pkg = packages.find(p => p.id === inv.packageId);
    const tracking = pkg ? pkg.trackingNumber : "";
    const client = pkg ? getClientName(pkg.userId) : "";
    
    return inv.id.toLowerCase().includes(searchInvQuery.toLowerCase()) ||
      tracking.toLowerCase().includes(searchInvQuery.toLowerCase()) ||
      client.toLowerCase().includes(searchInvQuery.toLowerCase());
  });

  // Render checking authentication loader
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <RefreshCw className="h-8 w-8 text-brand-cyan animate-spin" />
        <span className="text-xs font-semibold">Cargando puerta de enlace master...</span>
      </div>
    );
  }

  // Render Lock Gate if unauthorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-[#0f172a] border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 bg-brand-orange/10 text-brand-orange border border-brand-orange/20 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-orange/5 animate-pulse">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-heading text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5 mt-2">
              BreezeGo Master Gate
            </h1>
            <p className="text-slate-400 text-xs max-w-xs">
              Consola de Administración Restringida. Ingrese la clave master del negocio para desbloquear.
            </p>
          </div>

          {authError && (
            <div className="p-3 border border-brand-orange/20 bg-brand-orange/5 rounded-xl text-brand-orange text-xs text-center font-semibold animate-shake">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthorize} className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Clave Master</label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="text-xs text-white bg-slate-900 border-white/10 focus:border-brand-orange h-11"
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2 rounded-xl h-11 uppercase font-heading font-extrabold text-xs tracking-wider text-white bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/10 flex items-center justify-center gap-2"
            >
              <span>Desbloquear Consola</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="text-center border-t border-white/5 pt-4 text-[10px] text-slate-500">
            <Link href="/" className="hover:text-slate-350 transition-colors">
              ← Volver al sitio público
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Dashboard if Authorized
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="h-16 bg-[#0b0f19] text-white px-6 flex items-center justify-between shrink-0 border-b border-white/5 shadow-md">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <img 
              src="/logo.png" 
              alt="BreezeGo Logo" 
              className="h-10 w-auto object-contain" 
            />
          </Link>
          <span className="bg-brand-orange/20 text-brand-orange border border-brand-orange/30 text-[9px] px-2 py-0.5 rounded-lg font-mono font-bold uppercase tracking-widest hidden sm:inline-block">
            Master Console
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link 
            href="/"
            className="text-xs text-slate-400 hover:text-white font-bold transition-all"
          >
            Ir al Sitio Público
          </Link>
          <button 
            onClick={handleLockConsole}
            className="flex items-center space-x-2 px-3 py-1.5 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange rounded-xl text-xs font-extrabold transition-all border border-brand-orange/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Bloquear</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8 pb-20">
        
        {/* 1. Dashboard Sub-Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Panel Master de Control
              <span className="bg-brand-cyan/15 text-brand-teal text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Full Access
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-1.5 max-w-xl">
              Consola administrativa del dueño. Modifica tarifas en vivo, gestiona cuentas de clientes, opera fletes en aduanas y registra pagos.
            </p>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
            <div className="relative flex items-center px-4 py-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-full font-mono text-[10px] font-bold">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
              </span>
              CONECTADO
            </div>
            <button 
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all"
              title="Refrescar base de datos"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. TABBED NAVIGATION */}
        <div className="flex border-b border-slate-200/80 overflow-x-auto gap-2">
          {(["overview", "users", "packages", "tracking", "billing", "settings"] as TabType[]).map((tab) => {
            let label = "Vista General";
            let Icon = Compass;
            if (tab === "users") { label = "Clientes (CRM)"; Icon = Users; }
            if (tab === "packages") { label = "Paquetes & Aduanas"; Icon = Truck; }
            if (tab === "tracking") { label = "Rastreo Manual"; Icon = MapPin; }
            if (tab === "billing") { label = "Facturas & Pagos"; Icon = DollarSign; }
            if (tab === "settings") { label = "Configurar Tarifas"; Icon = Settings; }

            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setEditingUserId(null);
                  setIsCreatingUser(false);
                }}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  isSelected
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. DYNAMIC CONTENT WRAPPER */}
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-orange" />
            <span className="font-semibold text-slate-500">Cargando base de datos del negocio...</span>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            
            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* KPIs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-[#10b981]" />
                      Ingresos Recaudados
                    </span>
                    <h2 className="text-2xl font-extrabold text-[#10b981] font-heading mt-2">
                      ${paidRevenue} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </h2>
                    <span className="text-[9.5px] font-semibold text-slate-400 mt-1.5">
                      ≈ ₡{(paidRevenue * 500).toLocaleString()} CRC
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand-orange" />
                      Cuentas por Cobrar
                    </span>
                    <h2 className="text-2xl font-extrabold text-brand-orange font-heading mt-2">
                      ${pendingRevenue} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </h2>
                    <span className="text-[9.5px] font-semibold text-slate-400 mt-1.5">
                      ≈ ₡{(pendingRevenue * 500).toLocaleString()} CRC
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-brand-cyan" />
                      Paquetes Totales
                    </span>
                    <h2 className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
                      {packages.length}
                    </h2>
                    <span className="text-[9.5px] font-semibold text-[#10b981] mt-1.5">
                      📈 {customsCount} en aduana | {repartoCount} en reparto
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      Clientes Activos
                    </span>
                    <h2 className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
                      {users.length}
                    </h2>
                    <span className="text-[9.5px] font-semibold text-indigo-500 mt-1.5">
                      👥 100% Casilleros Miami Activos
                    </span>
                  </div>
                </div>

                {/* Chart & Live Status Split */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Analytics SVG Chart (7 cols) */}
                  <div className="lg:col-span-7 bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading text-sm font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                        Volumen de Importaciones y Facturación
                      </h3>
                      <p className="text-slate-500 text-[10px] font-medium mt-1">
                        Resumen mensual de fletes aéreos de Miami consolidado en Costa Rica.
                      </p>
                    </div>

                    <div className="relative mt-6 w-full h-[150px]">
                      <svg viewBox="0 0 400 150" className="w-full h-full">
                        <line x1="30" y1="20" x2="380" y2="20" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1"/>
                        <line x1="30" y1="60" x2="380" y2="60" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1"/>
                        <line x1="30" y1="100" x2="380" y2="100" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1"/>
                        <line x1="30" y1="130" x2="380" y2="130" stroke="rgba(15, 23, 42, 0.15)" strokeWidth="1.5"/>

                        {/* Month Bars */}
                        <rect x="50" y="70" width="24" height="60" rx="4" fill="#475569" />
                        <text x="50" y="145" fill="#64748b" fontSize="8" fontFamily="sans-serif">Ene</text>
                        
                        <rect x="110" y="55" width="24" height="75" rx="4" fill="#334155" />
                        <text x="110" y="145" fill="#64748b" fontSize="8" fontFamily="sans-serif">Feb</text>
                        
                        <rect x="170" y="40" width="24" height="90" rx="4" fill="#1e293b" />
                        <text x="170" y="145" fill="#64748b" fontSize="8" fontFamily="sans-serif">Mar</text>
                        
                        <rect x="230" y="30" width="24" height="100" rx="4" fill="#0C8096" />
                        <text x="230" y="145" fill="#64748b" fontSize="8" fontFamily="sans-serif">Abr</text>
                        
                        <rect x="290" y="15" width="24" height="115" rx="4" fill="#46C7D2" />
                        <text x="290" y="145" fill="#0C8096" fontSize="8" fontFamily="sans-serif" fontWeight="bold">Mayo</text>
                      </svg>
                    </div>
                  </div>

                  {/* Operations Status and Rates Panel */}
                  <div className="lg:col-span-5 bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading text-sm font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        Tarifas Vigentes en el Calculador
                      </h3>
                      <p className="text-slate-500 text-[10px] font-medium mt-1">
                        Precios configurados que consumen la Landing Page y la Calculadora.
                      </p>
                    </div>

                    <div className="mt-4 space-y-3.5 text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/40">
                        <span className="font-semibold text-slate-600">Miami Lanzamiento:</span>
                        <strong className="text-brand-orange font-bold font-mono">₡{(settings?.miamiLaunchRate ?? 6000).toLocaleString()} / Kg</strong>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/40">
                        <span className="font-semibold text-slate-600">Miami Regular:</span>
                        <strong className="text-slate-800 font-bold font-mono">₡{(settings?.miamiRegularRate ?? 7000).toLocaleString()} / Kg</strong>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <button 
                        onClick={() => setActiveTab("settings")}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Modificar Tarifas de Negocio
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: USERS (CRM) */}
            {activeTab === "users" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Users Ledger */}
                <div className="lg:col-span-7 bg-white border border-slate-200/85 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
                    <div>
                      <h3 className="font-heading text-sm font-extrabold text-slate-800">
                        Registro General de Clientes
                      </h3>
                      <p className="text-slate-500 text-[10px] font-medium mt-0.5">
                        Administrador CRM de casilleros registrados.
                      </p>
                    </div>
                    
                    {/* Actions & Search */}
                    <div className="flex items-center gap-2 max-w-sm w-full">
                      <div className="relative flex-1">
                        <input 
                          type="text"
                          placeholder="Buscar por nombre, email o suite..."
                          value={searchUserQuery}
                          onChange={(e) => setSearchUserQuery(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[11px] bg-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setIsCreatingUser(true);
                          setEditingUserId(null);
                        }}
                        className="h-8 px-2.5 bg-[#10b981] hover:bg-[#0d9488] text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo Cliente
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto text-[11px]">
                    <table className="min-w-full divide-y divide-slate-100 table-fixed">
                      <thead className="bg-slate-50 text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-5 py-3 text-left w-24">SUITE</th>
                          <th className="px-5 py-3 text-left">CLIENTE</th>
                          <th className="px-5 py-3 text-left w-36">EMAIL</th>
                          <th className="px-5 py-3 text-center w-28">TELÉFONO</th>
                          <th className="px-5 py-3 text-right w-20">ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredUsers.map((user) => {
                          const isEditing = editingUserId === user.id;
                          return (
                            <tr 
                              key={user.id} 
                              onClick={() => handleEditUser(user)}
                              className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                                isEditing ? "bg-brand-orange/5 border-l-2 border-brand-orange" : ""
                              }`}
                            >
                              <td className="px-5 py-3.5 font-mono font-bold text-brand-cyan truncate">
                                {user.suiteCode}
                              </td>
                              <td className="px-5 py-3.5 text-slate-800 font-bold truncate">
                                {user.fullName} {user.lastName}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 truncate">
                                {user.email}
                              </td>
                              <td className="px-5 py-3.5 text-center text-slate-600 font-mono">
                                {user.phone}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button 
                                  className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                                    isEditing ? "bg-brand-orange text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditUser(user);
                                  }}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: CRM Form (Edit/Create) */}
                <div id="crm-client-form-panel" className="lg:col-span-5">
                  {isCreatingUser && (
                    <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-[#10b981]">
                        <div className="flex items-center space-x-2">
                          <Plus className="h-5 w-5" />
                          <div>
                            <h3 className="font-heading text-sm font-extrabold text-slate-800">Crear Nuevo Cliente</h3>
                            <p className="text-slate-500 text-[10px] mt-0.5">Registra un nuevo casillero Miami.</p>
                          </div>
                        </div>
                        <button onClick={() => setIsCreatingUser(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Nombre</label>
                            <Input 
                              type="text" 
                              placeholder="Ej: Jessica"
                              value={newFullName} 
                              onChange={(e) => setNewFullName(e.target.value)} 
                              required 
                              className="text-xs text-slate-855 border-slate-200 bg-white"
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Apellido</label>
                            <Input 
                              type="text" 
                              placeholder="Ej: Chaves Brizuela"
                              value={newLastName} 
                              onChange={(e) => setNewLastName(e.target.value)} 
                              required 
                              className="text-xs text-slate-855 border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Correo Electrónico</label>
                          <Input 
                            type="email" 
                            placeholder="Ej: carlos@gmail.com"
                            value={newEmail} 
                            onChange={(e) => setNewEmail(e.target.value)} 
                            required 
                            className="text-xs text-slate-855 border-slate-200 bg-white"
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Teléfono Celular</label>
                          <Input 
                            type="text" 
                            placeholder="Ej: +506 8800-0000"
                            value={newPhone} 
                            onChange={(e) => setNewPhone(e.target.value)} 
                            required 
                            className="text-xs text-slate-855 border-slate-200 bg-white"
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Cédula</label>
                          <Input 
                            type="text" 
                            placeholder="Ej: 1-1111-2222"
                            value={newIdCard} 
                            onChange={(e) => setNewIdCard(e.target.value)} 
                            required 
                            className="text-xs text-slate-855 border-slate-200 bg-white"
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Dirección Física (CR)</label>
                          <textarea 
                            placeholder="Dirección para reparto..."
                            value={newAddress} 
                            onChange={(e) => setNewAddress(e.target.value)} 
                            required 
                            rows={2}
                            className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          loading={saving}
                          className="w-full rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-white bg-[#10b981] hover:bg-[#0d9488]"
                        >
                          Crear Cuenta y Asignar Suite
                        </Button>
                      </form>
                    </div>
                  )}

                  {editingUserId && !isCreatingUser && (
                    <>
                      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-brand-orange">
                        <div className="flex items-center space-x-2">
                          <Edit className="h-5 w-5" />
                          <div>
                            <h3 className="font-heading text-sm font-extrabold text-slate-800">Editar Ficha de Cliente</h3>
                            <p className="text-slate-500 text-[10px] mt-0.5">Modifica los detalles y preferencias del casillero.</p>
                          </div>
                        </div>
                        <button onClick={() => setEditingUserId(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Nombre</label>
                            <Input 
                              type="text" 
                              value={userFullName} 
                              onChange={(e) => setUserFullName(e.target.value)} 
                              required 
                              className="text-xs text-slate-855 border-slate-200 bg-white"
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Apellido</label>
                            <Input 
                              type="text" 
                              value={userLastName} 
                              onChange={(e) => setUserLastName(e.target.value)} 
                              required 
                              className="text-xs text-slate-855 border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Teléfono Celular</label>
                          <Input 
                            type="text" 
                            value={userPhone} 
                            onChange={(e) => setUserPhone(e.target.value)} 
                            required 
                            className="text-xs text-slate-855 border-slate-200 bg-white"
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Cédula</label>
                          <Input 
                            type="text" 
                            value={userIdCard} 
                            onChange={(e) => setUserIdCard(e.target.value)} 
                            required 
                            className="text-xs text-slate-855 border-slate-200 bg-white"
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Dirección Física (CR)</label>
                          <textarea 
                            value={userAddress} 
                            onChange={(e) => setUserAddress(e.target.value)} 
                            required 
                            rows={2}
                            className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Zona Entrega</label>
                            <select
                              value={userDeliveryMethod}
                              onChange={(e) => setUserDeliveryMethod(e.target.value as any)}
                              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                            >
                              <option value="gam">Gran Área Metropolitana</option>
                              <option value="rural">Rural (Fuera de GAM)</option>
                              <option value="locker">Sucursal (Retiro Físico)</option>
                            </select>
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase text-[9px] tracking-wide">Velocidad Flete</label>
                            <select
                              value={userSpeedPreference}
                              onChange={(e) => setUserSpeedPreference(e.target.value as any)}
                              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                            >
                              <option value="standard">Aéreo Standard</option>
                              <option value="express">Aéreo Express (3 a 6 días hábiles)</option>
                            </select>
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          loading={saving}
                          className="w-full rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-white bg-brand-orange hover:bg-brand-orange/90 shadow-md shadow-brand-orange/10"
                        >
                          Actualizar Datos de Cliente
                        </Button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleDeleteUser(editingUserId)}
                          className="w-full h-11 rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all focus:outline-none flex items-center justify-center gap-1.5"
                        >
                          Eliminar Casillero / Cliente
                        </button>
                      </form>
                    </div>

                    {/* Monitoreo Anti-Fraude (Billetera) */}
                    <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6 mt-4">
                      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4 text-[#ef4444]">
                        <ShieldCheck className="h-5 w-5 text-red-500" />
                        <div>
                          <h3 className="font-heading text-sm font-extrabold text-slate-800">
                            Monitoreo Anti-Fraude (Billetera)
                          </h3>
                          <p className="text-slate-500 text-[10px] mt-0.5">
                            Tarjetas tokenizadas registradas por el cliente.
                          </p>
                        </div>
                      </div>

                      {!selectedUser?.savedCards || selectedUser.savedCards.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          El cliente no tiene métodos de pago registrados en su billetera.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-700 flex items-start gap-2">
                            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold block">Control de Estafas:</strong>
                              Asegúrese de que el titular de la tarjeta coincida con la cédula y nombre del casillero registrado para prevenir suplantación de identidad.
                            </div>
                          </div>
                          
                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                            {selectedUser.savedCards.map((card: any) => (
                              <div key={card.id} className="p-3.5 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-700 uppercase">{card.brand}</span>
                                    <span className="font-mono text-slate-850 font-bold">•••• •••• •••• {card.last4}</span>
                                    {card.isDefault && (
                                      <span className="bg-brand-cyan/15 text-brand-cyan text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                                        Predet.
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-550 space-y-0.5">
                                    <p className="truncate"><strong>Titular:</strong> {card.holderName}</p>
                                    <p><strong>Vencimiento:</strong> {card.expDate}</p>
                                  </div>
                                </div>
                                <div className="text-right text-[10px] space-y-0.5 font-mono text-slate-400 shrink-0">
                                  <p className="text-slate-500"><strong>Token ID:</strong></p>
                                  <p className="text-[9px] truncate max-w-[150px]">{card.token}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] text-slate-550 bg-slate-550/5 p-3 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-600">Débito Automático (Auto-Pay):</span>
                            <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded ${selectedUser.autoPayEnabled ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                              {selectedUser.autoPayEnabled ? "Habilitado" : "Deshabilitado"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                  {!editingUserId && !isCreatingUser && (
                    <div className="p-12 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      Selecciona un cliente de la lista para editar.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: PACKAGES (OPERATIONS) */}
            {activeTab === "packages" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Packages Table */}
                <div className="lg:col-span-7 bg-white border border-slate-200/85 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
                    <div>
                      <h3 className="font-heading text-sm font-extrabold text-slate-800">
                        Inventario y Estado de Aduanas
                      </h3>
                      <p className="text-slate-500 text-[10px] font-medium mt-0.5">
                        Ledger para control de manifiestos y nacionalización.
                      </p>
                    </div>
                    
                    {/* Search and Sync Controls */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSyncAcs}
                        disabled={isSyncing}
                        className={`h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm ${
                          isSyncing ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-brand-cyan ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Sincronizando..." : "Sincronizar ACS"}
                      </button>
                      <div className="relative max-w-xs w-48">
                        <input 
                          type="text"
                          placeholder="Buscar por tracking o cliente..."
                          value={searchPkgQuery}
                          onChange={(e) => setSearchPkgQuery(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[11px] bg-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto text-[11px]">
                    <table className="min-w-full divide-y divide-slate-100 table-fixed">
                      <thead className="bg-slate-50 text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-5 py-3 text-left w-24">CÓDIGO / SUITE</th>
                          <th className="px-5 py-3 text-left">CLIENTE</th>
                          <th className="px-5 py-3 text-left">DESCRIPCIÓN</th>
                          <th className="px-5 py-3 text-center w-20">PESO</th>
                          <th className="px-5 py-3 text-left w-32">ESTADO</th>
                          <th className="px-5 py-3 text-right w-20">ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPackages.map((pkg) => {
                          const isSelected = selectedPkgId === pkg.id;
                          return (
                            <tr 
                              key={pkg.id} 
                              onClick={() => handleSelectPackage(pkg)}
                              className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                                isSelected ? "bg-brand-orange/5 border-l-2 border-brand-orange" : ""
                              }`}
                            >
                              <td className="px-5 py-3.5 font-mono truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{pkg.trackingNumber.substring(0, 8)}...</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase inline-flex items-center gap-0.5 ${
                                    pkg.shippingMode === "sea" ? "bg-cyan-50 text-cyan-700 border border-cyan-200/40" : "bg-indigo-50 text-indigo-700 border border-indigo-200/40"
                                  }`}>
                                    {pkg.shippingMode === "sea" ? "🚢 Marítimo" : pkg.shippingMode === "air_colombia" ? "✈️ Aéreo (Col)" : "✈️ Aéreo"}
                                  </span>
                                </div>
                                <span className="block text-[8px] text-slate-400 font-bold tracking-wider uppercase">{getClientSuite(pkg.userId)}</span>
                              </td>
                              <td className="px-5 py-3.5 text-slate-800 font-bold truncate">
                                {getClientName(pkg.userId)}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 truncate font-medium">
                                {pkg.description}
                              </td>
                              <td className="px-5 py-3.5 text-center text-slate-650 font-mono font-bold">
                                {pkg.shippingMode === "sea" ? `${pkg.weight} CFT` : `${pkg.weight} Kg`}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded-full font-bold font-heading text-[8px] uppercase tracking-wider inline-block ${
                                  pkg.status === "prealerted" && "bg-slate-100 text-slate-550 border border-slate-200/50"
                                } ${
                                  pkg.status === "received" && "bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                                } ${
                                  (pkg.status === "in_transit" || pkg.status === "customs" || pkg.status === "out_for_delivery") && "bg-brand-cyan/10 text-brand-teal border border-brand-cyan/20"
                                } ${
                                  pkg.status === "delivered" && "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                                }`}>
                                  {pkg.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button 
                                  className={`px-2 py-1 rounded text-[9.5px] font-bold transition-all ${
                                    isSelected ? "bg-brand-orange text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectPackage(pkg);
                                  }}
                                >
                                  Operar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: Package Modifier Form */}
                <div id="shipping-operation-panel" className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6">
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-4 text-brand-orange">
                      <Shield className="h-5 w-5" />
                      <div>
                        <h3 className="font-heading text-sm font-extrabold text-slate-800">Panel de Operación de Envíos</h3>
                        <p className="text-slate-500 text-[10px] mt-0.5">Modifica fletes arancelarios y dispara notificaciones.</p>
                      </div>
                    </div>

                    {selectedPkg ? (
                      <form onSubmit={handleUpdatePackage} className="space-y-4 text-xs">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/50 space-y-1 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-extrabold tracking-wider">Paquete Activo</span>
                            <strong className="text-slate-800 block font-bold leading-snug">{selectedPkg.description}</strong>
                            <span className="text-[9px] text-slate-550 font-mono block">Tracking: {selectedPkg.trackingNumber}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-bold font-heading text-[8px] uppercase tracking-wider inline-block ${
                            selectedPkg.shippingMode === "sea" ? "bg-cyan-50 text-cyan-700 border border-cyan-200/40" : "bg-indigo-50 text-indigo-700 border border-indigo-200/40"
                          }`}>
                            {selectedPkg.shippingMode === "sea" ? "🚢 Marítimo" : selectedPkg.shippingMode === "air_colombia" ? "✈️ Aéreo (Col)" : "✈️ Aéreo"}
                          </span>
                        </div>

                        {selectedPkg.invoiceUrl && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200/35 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-emerald-600 block uppercase font-extrabold tracking-wider">Factura Adjunta</span>
                              <span className="text-[10px] text-slate-650 block leading-tight font-medium">El cliente adjuntó una factura comercial.</span>
                            </div>
                            <a
                              href={selectedPkg.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider whitespace-nowrap"
                            >
                              Ver Factura
                            </a>
                          </div>
                        )}

                        {/* Asociar a Cliente */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider font-heading">Asociar a Cliente</label>
                          <select
                            value={pkgUserId}
                            onChange={(e) => setPkgUserId(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                          >
                            <option value="">-- Sin Asignar (Paquete Huérfano) --</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.fullName} ({u.suiteCode})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Weight */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 flex items-center gap-1 uppercase text-[10px] tracking-wider">
                            <Scale className="h-3.5 w-3.5 text-brand-orange" />
                            {pkgShippingMode === "sea" ? "Volumen Registrado (CFT)" : "Peso Físico Registrado"}
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="any"
                              value={pkgWeightInputVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPkgWeightInputVal(val);
                                const num = parseFloat(val) || 0;
                                let kgs = num;
                                if (pkgShippingMode !== "sea") {
                                  if (pkgWeightUnit === "lbs") {
                                    kgs = num / 2.20462;
                                  } else if (pkgWeightUnit === "g") {
                                    kgs = num * 0.001;
                                  }
                                }
                                setPkgWeight(kgs);
                              }}
                              className="text-xs text-slate-800 border-slate-200 bg-white"
                              required
                            />
                            {pkgShippingMode !== "sea" ? (
                              <select
                                value={pkgWeightUnit}
                                onChange={(e) => {
                                  const nextUnit = e.target.value as "kgs" | "lbs" | "g";
                                  const currentNum = parseFloat(pkgWeightInputVal) || 0;
                                  const converted = convertWeight(currentNum, pkgWeightUnit, nextUnit);
                                  setPkgWeightUnit(nextUnit);
                                  setPkgWeightInputVal(Number(converted.toFixed(3)).toString());
                                }}
                                className="flex h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-brand-orange focus:outline-none w-28 shrink-0"
                              >
                                <option value="kgs">Kilos (Kg)</option>
                                <option value="lbs">Libras (Lb)</option>
                                <option value="g">Gramos (g)</option>
                              </select>
                            ) : (
                              <div className="flex items-center px-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-bold uppercase shrink-0 h-9">
                                CFT
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tipo de Envío */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">Método de Envío</label>
                          <select
                            value={pkgShippingMode}
                            onChange={(e) => setPkgShippingMode(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                          >
                            <option value="air">✈️ USA Aéreo (Express)</option>
                            <option value="air_colombia">✈️ Colombia Aéreo</option>
                            <option value="sea">🚢 USA Marítimo (Económico)</option>
                          </select>
                        </div>

                        {/* FOB Value */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-650 uppercase text-[10px] tracking-wider">Valor Comercial (FOB USD)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={pkgDeclaredValue}
                            onChange={(e) => setPkgDeclaredValue(e.target.value)}
                            className="text-xs text-slate-800 border-slate-200 bg-white"
                            required
                          />
                        </div>

                        {/* Category */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-650 uppercase text-[10px] tracking-wider">Categoría de Importación</label>
                          <select
                            value={pkgCategory}
                            onChange={(e) => setPkgCategory(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                          >
                            <option value="general">General / Ropa / Zapatos</option>
                            <option value="electronics">Electrónicos (IVA 13%)</option>
                            <option value="books">Libros (IVA 1%)</option>
                            <option value="cosmetics">Cosméticos (Impuesto 54.55%)</option>
                            <option value="carparts">Repuestos de Vehículos (Impuesto 49.27%)</option>
                          </select>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="font-bold text-slate-650 uppercase text-[10px] tracking-wider">Hito Logístico</label>
                          <select
                            value={pkgStatus}
                            onChange={(e) => setPkgStatus(e.target.value as PackageStatus)}
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                          >
                            <option value="prealerted">Prealertado por Cliente</option>
                            <option value="received">Listo en Miami (Bodegaje)</option>
                            <option value="in_transit">En Tránsito SJO (Consolidado)</option>
                            <option value="customs">Aduana Costa Rica (Aforo TICA)</option>
                            <option value="out_for_delivery">En Reparto Local (GPS Tracker)</option>
                            <option value="delivered">Entregado Físicamente</option>
                          </select>
                        </div>

                        {/* Driver details */}
                        {pkgStatus === "out_for_delivery" && (
                          <div className="p-3.5 bg-brand-orange/5 border border-brand-orange/15 rounded-xl space-y-3.5">
                            <div className="flex items-center gap-1 text-[10px] text-brand-orange font-bold uppercase tracking-wider">
                              <Truck className="h-4 w-4" />
                              Chofer y Ubicación GPS
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Latitud GPS</label>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  value={gpsLat}
                                  onChange={(e) => setGpsLat(Number(e.target.value))}
                                  className="text-xs h-9 text-slate-800 border-slate-200 bg-white"
                                />
                              </div>
                              <div className="flex flex-col space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Longitud GPS</label>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  value={gpsLon}
                                  onChange={(e) => setGpsLon(Number(e.target.value))}
                                  className="text-xs h-9 text-slate-800 border-slate-200 bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Nombre Chofer</label>
                              <Input
                                type="text"
                                value={driverName}
                                onChange={(e) => setDriverName(e.target.value)}
                                className="text-xs h-9 text-slate-800 border-slate-200 bg-white"
                              />
                            </div>
                          </div>
                        )}
                         <Button
                          type="submit"
                          loading={saving}
                          className="w-full mt-3 rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-white bg-brand-orange hover:bg-brand-orange/90 shadow-md shadow-brand-orange/10"
                        >
                          Guardar Cambios de Flete
                        </Button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => window.open(`/admin/label?id=${selectedPkg.id}&print=true`, "_blank")}
                          className="w-full h-11 mt-3 rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-[#0b0f19] bg-brand-cyan hover:bg-brand-cyan/90 hover:shadow-md hover:shadow-brand-cyan/10 transition-all focus:outline-none flex items-center justify-center gap-1.5"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir Etiqueta / Sticker
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleDeletePackage(selectedPkg.id)}
                          className="w-full h-11 mt-2 rounded-xl uppercase font-heading font-extrabold text-[10px] tracking-wider text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all focus:outline-none flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar Paquete
                        </button>
                      </form>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        Selecciona un paquete para operar.
                      </div>
                    )}
                  </div>

                  {/* Live Email mock */}
                  {selectedPkg && (
                    <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <Mail className="h-4.5 w-4.5 text-brand-cyan" />
                          Previsualizador de Correo
                        </h3>
                        <span className="text-[8.5px] font-bold bg-brand-cyan/10 text-brand-cyan px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                          SMTP Server
                        </span>
                      </div>

                      <div className="bg-[#f8fafc] border border-slate-200/70 p-4 rounded-xl mt-3 relative flex flex-col overflow-hidden shadow-inner">
                        {/* Email Header Mock */}
                        <div className="bg-[#0b0f19] text-white px-3 py-2 text-[9.5px] rounded-t-lg -mx-4 -mt-4 border-b border-white/5 flex items-center justify-between">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            BreezeGo Logística &lt;logistics@breezego.net&gt;
                          </div>
                          <div className="text-[8px] text-slate-400 font-mono">Asunto: Actualización de Guía</div>
                        </div>
                        
                        <div className="text-[8.5px] text-slate-500 mt-2.5 space-y-0.5 border-b border-slate-200/60 pb-2">
                          <div><strong>Para:</strong> {getClientName(selectedPkg.userId)} &lt;{getClientName(selectedPkg.userId).toLowerCase().replace(/\s+/g, "")}@correo.com&gt;</div>
                        </div>

                        {/* Branded Email Content Mockup */}
                        <div className="bg-slate-100 p-3 rounded-xl mt-3 relative flex-1 text-[10px] space-y-4">
                          
                          {/* Simulated Email Wrapper */}
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-w-sm mx-auto">
                            
                            {/* Branded Header */}
                            <div className="bg-[#0b0f19] p-3 text-center border-b-2 border-brand-cyan">
                              <span className="font-heading text-xs font-black text-white tracking-wide">
                                Breeze<span className="text-brand-cyan">Go</span>
                              </span>
                              <span className="text-[6px] text-brand-cyan block font-bold tracking-widest mt-0.5">
                                TUS PAQUETES EN MOVIMIENTO
                              </span>
                            </div>

                            {/* Branded Body */}
                            <div className="p-3 space-y-3">
                              <p className="text-[9px] text-slate-600 leading-snug">
                                Hola, <strong>{getClientName(selectedPkg.userId)}</strong>. Tu paquete ha cambiado de estado:
                              </p>

                              {/* Waybill Sticker Card inside Email */}
                              <div className="bg-[#f8fafc] border-2 border-dashed border-brand-cyan/80 p-3 rounded-lg space-y-2.5">
                                
                                {/* Sticker Title Row */}
                                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                  <div>
                                    <span className="text-[8px] font-extrabold text-slate-900 block leading-tight">BreezeGo Logistics</span>
                                    <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider block">GUÍA DE IMPORTACIÓN</span>
                                  </div>
                                  <span className={`text-[7px] font-extrabold text-white px-2 py-0.5 rounded uppercase ${
                                    pkgStatus === 'delivered' ? 'bg-[#10b981]' : 'bg-brand-orange'
                                  }`}>
                                    {pkgStatus === "prealerted" ? "Prealertado" : 
                                     pkgStatus === "received" ? "Listo en Miami" : 
                                     pkgStatus === "in_transit" ? "En Vuelo" : 
                                     pkgStatus === "customs" ? "En Aduana" : 
                                     pkgStatus === "out_for_delivery" ? "En Reparto" : 
                                     pkgStatus === "delivered" ? "Entregado" : "Actualizado"}
                                  </span>
                                </div>

                                {/* Simulated Barcode */}
                                <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                                  <div className="font-mono font-bold text-[9px] text-slate-800 tracking-wider">
                                    *{selectedPkg.trackingNumber}*
                                  </div>
                                  <span className="text-[5.5px] text-slate-400 font-bold block mt-0.5">TRACKING: {selectedPkg.trackingNumber}</span>
                                </div>

                                {/* Sticker Package Details */}
                                <div className="text-[8px] space-y-1 text-slate-600">
                                  <div><strong>Casillero:</strong> <span className="font-bold text-slate-800">{getClientSuite(selectedPkg.userId)}</span></div>
                                  <div><strong>{selectedPkg.shippingMode === "sea" ? "Volumen:" : "Peso:"}</strong> <span className="font-bold text-slate-800">{pkgWeight || selectedPkg.weight} {selectedPkg.shippingMode === "sea" ? "CFT" : "Kg"}</span></div>
                                  <div><strong>Descripción:</strong> <span className="font-bold text-slate-800">{selectedPkg.description || "N/A"}</span></div>
                                </div>

                                <hr className="border-slate-200" />

                                {/* Branded Timeline inside CRM Email Mock */}
                                <div className="flex justify-between items-center px-1">
                                  {(() => {
                                    let activeIdx = 0;
                                    if (pkgStatus === "prealerted" || pkgStatus === "received") activeIdx = 0;
                                    else if (pkgStatus === "in_transit") activeIdx = 1;
                                    else if (pkgStatus === "customs") activeIdx = 2;
                                    else if (pkgStatus === "out_for_delivery") activeIdx = 3;
                                    else if (pkgStatus === "delivered") activeIdx = 4;

                                    const steps = [
                                      { label: "Miami", icon: "📦" },
                                      { label: "Vuelo", icon: "✈️" },
                                      { label: "Aduana", icon: "🏛️" },
                                      { label: "Reparto", icon: "🚚" },
                                      { label: "Entregado", icon: "🎉" }
                                    ];

                                    return steps.map((s, idx) => {
                                      const isAct = idx <= activeIdx;
                                      const isCur = idx === activeIdx;
                                      return (
                                        <div key={idx} className="flex flex-col items-center w-1/5">
                                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] border transition-all ${
                                            isCur ? 'bg-brand-orange border-brand-orange shadow-md shadow-brand-orange/20' : 
                                            isAct ? 'bg-brand-cyan border-brand-cyan text-white' : 'bg-slate-100 border-slate-200 text-slate-400'
                                          }`}>
                                            {s.icon}
                                          </div>
                                          <span className={`text-[5.5px] mt-1 font-bold uppercase tracking-tighter ${
                                            isAct ? 'text-slate-800' : 'text-slate-400'
                                          }`}>
                                            {s.label}
                                          </span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                              </div>

                              {/* Branded CTA Button */}
                              <div className="text-center pt-1.5">
                                <span className="inline-block bg-brand-cyan text-slate-900 text-[8px] font-extrabold uppercase tracking-wide px-4 py-2 rounded-lg shadow-sm border border-brand-cyan/20 cursor-pointer">
                                  Rastrear en Vivo en la Web
                                </span>
                              </div>
                            </div>
                            
                            {/* Branded Footer */}
                            <div className="bg-[#0b0f19] text-[6.5px] p-2 text-center text-slate-500 border-t border-white/5">
                              © {new Date().getFullYear()} BreezeGo S.A. | Costa Rica • Miami Hub
                            </div>

                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: MANUAL TRACKING (REGISTRATION) */}
            {activeTab === "tracking" && (
              <div className="max-w-2xl mx-auto bg-white border border-slate-200/85 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3 text-brand-orange">
                  <MapPin className="h-6 w-6" />
                  <div>
                    <h3 className="font-heading text-base font-extrabold text-slate-800">
                      Registro y Rastreo Manual de Paquetes
                    </h3>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      Ingresa paquetes que lleguen directamente a bodegas (Miami/CR) y no hayan sido prealertados por el cliente.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterPackage} className="p-6 space-y-6 text-xs text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Select Client */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        Cliente Destinatario *
                      </label>
                      <select
                        value={trackUserId}
                        onChange={(e) => setTrackUserId(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                        required
                      >
                        <option value="">Selecciona un cliente...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.suiteCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tracking Number */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        Número de Tracking *
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 1Z999AA10123456784, USPS-8891002"
                        value={trackTrackingNumber}
                        onChange={(e) => setTrackTrackingNumber(e.target.value)}
                        className="text-xs text-slate-800 border-slate-200 bg-white"
                        required
                      />
                    </div>

                    {/* Vendor */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        Comercio / Tienda de Origen *
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: Amazon, eBay, Nike, AliExpress"
                        value={trackVendor}
                        onChange={(e) => setTrackVendor(e.target.value)}
                        className="text-xs text-slate-800 border-slate-200 bg-white"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        Descripción del Artículo *
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: Audífonos Inalámbricos Pro, Ropa de bebé, Calzado"
                        value={trackDescription}
                        onChange={(e) => setTrackDescription(e.target.value)}
                        className="text-xs text-slate-800 border-slate-200 bg-white"
                        required
                      />
                    </div>

                    {/* Weight */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 flex items-center gap-1 uppercase text-[10px] tracking-wider">
                        <Scale className="h-3.5 w-3.5 text-brand-orange" />
                        {trackShippingMode === "sea" ? "Volumen Registrado (CFT)" : "Peso Registrado"}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="any"
                          value={trackWeightInputVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTrackWeightInputVal(val);
                            const num = parseFloat(val) || 0;
                            let kgs = num;
                            if (trackShippingMode !== "sea") {
                              if (trackWeightUnit === "lbs") {
                                kgs = num / 2.20462;
                              } else if (trackWeightUnit === "g") {
                                kgs = num * 0.001;
                              }
                            }
                            setTrackWeight(kgs);
                          }}
                          className="text-xs text-slate-800 border-slate-200 bg-white"
                        />
                        {trackShippingMode !== "sea" ? (
                          <select
                            value={trackWeightUnit}
                            onChange={(e) => {
                              const nextUnit = e.target.value as "kgs" | "lbs" | "g";
                              const currentNum = parseFloat(trackWeightInputVal) || 0;
                              const converted = convertWeight(currentNum, trackWeightUnit, nextUnit);
                              setTrackWeightUnit(nextUnit);
                              setTrackWeightInputVal(Number(converted.toFixed(3)).toString());
                            }}
                            className="flex h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-brand-orange focus:outline-none w-28 shrink-0"
                          >
                            <option value="kgs">Kilos (Kg)</option>
                            <option value="lbs">Libras (Lb)</option>
                            <option value="g">Gramos (g)</option>
                          </select>
                        ) : (
                          <div className="flex items-center px-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-bold uppercase shrink-0 h-9">
                            CFT
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Initial Status */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        Estado Inicial del Paquete
                      </label>
                      <select
                        value={trackStatus}
                        onChange={(e) => setTrackStatus(e.target.value as PackageStatus)}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                      >
                        <option value="prealerted">Prealertado (Esperando Miami)</option>
                        <option value="received">Listo en Miami (Bodegaje)</option>
                        <option value="in_transit">En Tránsito (Aéreo SJO)</option>
                        <option value="customs">En Aduana Costa Rica</option>
                        <option value="out_for_delivery">En Reparto Local (GPS)</option>
                        <option value="delivered">Entregado con Éxito</option>
                      </select>
                    </div>

                    {/* Shipping Mode */}
                    <div className="flex flex-col space-y-2">
                      <label className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                        Método de Envío
                      </label>
                      <select
                        value={trackShippingMode}
                        onChange={(e) => setTrackShippingMode(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-brand-orange focus:outline-none"
                      >
                        <option value="air">✈️ USA Aéreo (Express)</option>
                        <option value="air_colombia">✈️ Colombia Aéreo</option>
                        <option value="sea">🚢 USA Marítimo (Económico)</option>
                      </select>
                    </div>

                  </div>

                  {/* Driver details (Conditional) */}
                  {trackStatus === "out_for_delivery" && (
                    <div className="p-4 bg-brand-orange/5 border border-brand-orange/15 rounded-xl space-y-4 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[10px] text-brand-orange font-bold uppercase tracking-wider">
                        <Truck className="h-4 w-4" />
                        Detalles del Chofer y Reparto
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Nombre del Chofer</label>
                          <Input
                            type="text"
                            value={trackDriverName}
                            onChange={(e) => setTrackDriverName(e.target.value)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white"
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Teléfono del Chofer</label>
                          <Input
                            type="text"
                            value={trackDriverPhone}
                            onChange={(e) => setTrackDriverPhone(e.target.value)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      loading={isRegisteringPkg}
                      className="px-6 rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-slate-900 bg-[#46c7d2] hover:bg-[#3db8c3] shadow-md shadow-[#46c7d2]/10"
                    >
                      Registrar Ingreso de Paquete
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: BILLING & INVOICES */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                
                {/* Financial stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Facturado</span>
                    <h2 className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
                      ${(paidRevenue + pendingRevenue).toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </h2>
                  </div>
                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingresos Recaudados</span>
                    <h2 className="text-3xl font-extrabold text-[#10b981] font-heading mt-2">
                      ${paidRevenue} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </h2>
                  </div>
                  <div className="bg-white border border-slate-200/85 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Pendiente</span>
                    <h2 className="text-3xl font-extrabold text-brand-orange font-heading mt-2">
                      ${pendingRevenue} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </h2>
                  </div>
                </div>

                {/* Ledger */}
                <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
                    <div>
                      <h3 className="font-heading text-sm font-extrabold text-slate-800 font-heading">
                        Registro Histórico de Cobros
                      </h3>
                      <p className="text-slate-500 text-[10px] font-medium mt-0.5">
                        Administración manual de facturas y pasarela de cobro.
                      </p>
                    </div>
                    <div className="relative max-w-xs w-full">
                      <input 
                        type="text"
                        placeholder="Buscar factura, tracking o cliente..."
                        value={searchInvQuery}
                        onChange={(e) => setSearchInvQuery(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[11px] bg-white focus:outline-none focus:border-brand-cyan"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto text-[11px]">
                    <table className="min-w-full divide-y divide-slate-100 table-fixed">
                      <thead className="bg-slate-50 text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-5 py-3 text-left w-24">FACTURA ID</th>
                          <th className="px-5 py-3 text-left w-24">SUITE</th>
                          <th className="px-5 py-3 text-left">CLIENTE</th>
                          <th className="px-5 py-3 text-left w-36">CONCEPTO FLETE</th>
                          <th className="px-5 py-3 text-center w-24">TOTAL USD</th>
                          <th className="px-5 py-3 text-center w-24">TOTAL CRC</th>
                          <th className="px-5 py-3 text-center w-28">ESTADO</th>
                          <th className="px-5 py-3 text-right w-32">ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredInvoices.map((inv) => {
                          const pkg = packages.find(p => p.id === inv.packageId);
                          const clientName = pkg ? getClientName(pkg.userId) : "Cliente BreezeGo";
                          const clientSuite = pkg ? getClientSuite(pkg.userId) : "BZ-5062-MIA";

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-900 truncate">
                                {inv.id}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-brand-cyan font-bold truncate">
                                {clientSuite}
                              </td>
                              <td className="px-5 py-3.5 text-slate-800 font-bold truncate">
                                {clientName}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 truncate font-mono text-[10px]">
                                flete: ${inv.fleteCost} | tax: ${inv.taxesCost}
                              </td>
                              <td className="px-5 py-3.5 text-center text-slate-800 font-mono font-bold">
                                ${inv.totalCostUsd.toFixed(2)}
                              </td>
                              <td className="px-5 py-3.5 text-center text-slate-500 font-mono">
                                ₡{inv.totalCostCrc.toLocaleString()}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-bold font-heading text-[8px] uppercase tracking-wider inline-block ${
                                  inv.isPaid 
                                    ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" 
                                    : "bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                                }`}>
                                  {inv.isPaid ? "Pagado" : "Pendiente"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {inv.isPaid ? (
                                  <button
                                    onClick={() => handleToggleInvoicePayment(inv.id, inv.isPaid)}
                                    className="px-3 py-1 rounded text-[9px] font-bold bg-slate-100 hover:bg-brand-orange/10 text-slate-600 hover:text-brand-orange transition-all"
                                  >
                                    Marcar por Cobrar
                                  </button>
                                ) : (
                                  <div className="flex flex-col sm:flex-row gap-1.5 justify-end items-center">
                                    <button
                                      onClick={() => handleToggleInvoicePayment(inv.id, inv.isPaid)}
                                      className="px-2 py-1 rounded text-[8.5px] font-bold bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 transition-all"
                                    >
                                      Marcar Pagado
                                    </button>
                                    {generatedLinks[inv.id] ? (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(generatedLinks[inv.id]);
                                            alert("Enlace de pago copiado.");
                                          }}
                                          title="Copiar Enlace de Pago"
                                          className="px-2 py-1 rounded text-[8.5px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                                        >
                                          Copiar
                                        </button>
                                        <a
                                          href={`https://wa.me/${getClientPhone(pkg?.userId || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                                            `Estimado(a) ${clientName}, tu flete de casillero por flete listo es de $${inv.totalCostUsd} (₡${inv.totalCostCrc.toLocaleString()}). Puedes pagarlo de forma segura con tarjeta aquí: ${generatedLinks[inv.id]}`
                                          )}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Enviar por WhatsApp"
                                          className="px-2 py-1 rounded text-[8.5px] font-bold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center"
                                        >
                                          WhatsApp
                                        </a>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleGeneratePaymentLink(inv.id)}
                                        disabled={generatingLinkInvId === inv.id}
                                        className="px-2 py-1 rounded text-[8.5px] font-bold bg-brand-cyan/15 text-brand-cyan hover:bg-brand-cyan/25 transition-all disabled:opacity-50"
                                      >
                                        {generatingLinkInvId === inv.id ? "Generando..." : "Generar Link"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: MASTER TARIFF SETTINGS */}
            {activeTab === "settings" && (
              <div className="max-w-2xl bg-white border border-slate-200/85 rounded-2xl shadow-sm p-8">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-5 mb-6 text-brand-orange">
                  <Settings className="h-6 w-6" />
                  <div>
                    <h3 className="font-heading text-base font-extrabold text-slate-900">Configuración Master de Tarifas</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Controla y modifica en caliente las tarifas de fletes arancelarios del sitio.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-6 text-xs text-slate-700">
                  
                  {/* Flete */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5 font-heading">
                      <Compass className="h-4 w-4 text-brand-orange" />
                      Tarifas por Kilogramo (Vía Aérea)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-600">Miami Tarifa Lanzamiento (₡/Kg)</label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={miamiLaunchRate}
                          onChange={(e) => setMiamiLaunchRate(Number(e.target.value) || 0)}
                          className="text-xs text-slate-800 border-slate-200 bg-white font-mono"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-600">Miami Tarifa Regular (₡/Kg)</label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={miamiRegularRate}
                          onChange={(e) => setMiamiRegularRate(Number(e.target.value) || 0)}
                          className="text-xs text-slate-800 border-slate-200 bg-white font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5 font-heading">
                      <Truck className="h-4 w-4 text-brand-cyan" />
                      Tarifas de Entrega Local (₡ CRC)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-600">Entrega GAM (₡)</label>
                        <Input
                          type="number"
                          step="100"
                          min="0"
                          value={deliveryGamFee}
                          onChange={(e) => setDeliveryGamFee(Number(e.target.value) || 0)}
                          className="text-xs text-slate-800 border-slate-200 bg-white font-mono"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-600">Cartago y Alajuela (₡)</label>
                        <Input
                          type="number"
                          step="100"
                          min="0"
                          value={deliveryCartagoAlajuelaFee}
                          onChange={(e) => setDeliveryCartagoAlajuelaFee(Number(e.target.value) || 0)}
                          className="text-xs text-slate-800 border-slate-200 bg-white font-mono"
                          required
                        />
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <label className="font-bold text-slate-600">Fuera de la GAM (₡)</label>
                        <Input
                          type="number"
                          step="100"
                          min="0"
                          value={deliveryRuralFee}
                          onChange={(e) => setDeliveryRuralFee(Number(e.target.value) || 0)}
                          className="text-xs text-slate-800 border-slate-200 bg-white font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Box Consolidation */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5 font-heading">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                      Tarifas de Consolidación de Cajas ($ USD)
                    </h4>
                    
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                      <div className="font-bold text-slate-600 text-[10px] uppercase mb-1">Precios de Lanzamiento:</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-500">Caja Medium ($)</label>
                          <Input
                            type="number"
                            step="1"
                            value={boxMediumFee}
                            onChange={(e) => setBoxMediumFee(Number(e.target.value) || 0)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white font-mono"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-500">Caja Large ($)</label>
                          <Input
                            type="number"
                            step="1"
                            value={boxLargeFee}
                            onChange={(e) => setBoxLargeFee(Number(e.target.value) || 0)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white font-mono"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-500">Caja X-Large ($)</label>
                          <Input
                            type="number"
                            step="1"
                            value={boxXlargeFee}
                            onChange={(e) => setBoxXlargeFee(Number(e.target.value) || 0)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="font-bold text-slate-600 text-[10px] uppercase mt-3 mb-1">Precios Regulares:</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-500">Caja Medium ($)</label>
                          <Input
                            type="number"
                            step="1"
                            value={boxMediumFeeRegular}
                            onChange={(e) => setBoxMediumFeeRegular(Number(e.target.value) || 0)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white font-mono"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-500">Caja Large ($)</label>
                          <Input
                            type="number"
                            step="1"
                            value={boxLargeFeeRegular}
                            onChange={(e) => setBoxLargeFeeRegular(Number(e.target.value) || 0)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white font-mono"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-slate-500">Caja X-Large ($)</label>
                          <Input
                            type="number"
                            step="1"
                            value={boxXlargeFeeRegular}
                            onChange={(e) => setBoxXlargeFeeRegular(Number(e.target.value) || 0)}
                            className="text-xs h-9 text-slate-800 border-slate-200 bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    loading={saving}
                    className="w-full rounded-xl uppercase font-heading font-extrabold text-xs tracking-wider text-white bg-brand-orange hover:bg-brand-orange/90 shadow-md shadow-brand-orange/10 flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    <Lock className="h-4 w-4" />
                    Guardar Configuración Master
                  </Button>
                </form>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
