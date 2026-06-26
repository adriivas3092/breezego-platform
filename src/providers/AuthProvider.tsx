"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { mockAuth, initializeMockDb } from "@/lib/supabase";
import { supabase, isRealSupabaseActive } from "@/lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string, captchaToken?: string) => Promise<void>;
  signup: (data: Partial<User> & { captchaToken?: string }, password?: string) => Promise<{ needsVerification: boolean; suiteCode?: string } | void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      try {
        initializeMockDb();
        if (isRealSupabaseActive) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch the latest user object to get any administrative metadata updates (e.g. lastName)
            const { data: { user: latestUser } } = await supabase.auth.getUser();
            const activeUser = latestUser || session.user;
            const meta = activeUser.user_metadata || {};
            
            // Query ledger or existing localStorage profile to preserve saved cards & Auto-Pay settings
            let existingDbUser: any = null;
            const existingDbUserStr = localStorage.getItem("bz_supabase_db_user");
            if (existingDbUserStr) {
              try {
                const parsed = JSON.parse(existingDbUserStr);
                if (parsed.id === session.user.id) {
                  existingDbUser = parsed;
                }
              } catch (e) {}
            }

            let ledgerUser: any = null;
            try {
              const usersList = JSON.parse(localStorage.getItem("bz_supabase_db_users_list") || "[]");
              ledgerUser = usersList.find((u: any) => u.id === activeUser.id);
            } catch (e) {}

            const realUser: User = {
              id: activeUser.id,
              email: activeUser.email || "",
              fullName: meta.fullName || meta.full_name || "Cliente Real",
              lastName: meta.lastName || meta.last_name || "",
              phone: meta.phone || "",
              idCard: meta.idCard || "",
              address: meta.address || "",
              deliveryMethod: meta.deliveryMethod || "gam",
              speedPreference: meta.speedPreference || "standard",
              suiteCode: meta.suiteCode || "BEZG-XX",
              createdAt: activeUser.created_at || new Date().toISOString(),
              savedCards: ledgerUser?.savedCards || existingDbUser?.savedCards || [],
              autoPayEnabled: ledgerUser?.autoPayEnabled ?? existingDbUser?.autoPayEnabled ?? false,
            };
            setUser(realUser);
            localStorage.setItem("bz_supabase_db_user", JSON.stringify(realUser));
            if (typeof document !== "undefined") {
              document.cookie = `bz_auth_session=${session.access_token};path=/;max-age=3600;samesite=lax`;
            }
          } else {
            // Sin sesión válida de Supabase => sesión cerrada (no se restaura desde caché local).
            setUser(null);
          }
          return;
        }
        
        // Fallback to mock session
        const currentUser = await mockAuth.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error("Auth context initialization failed", err);
      } finally {
        setLoading(false);
      }
    }
    initSession();
  }, []);

  const login = async (email: string, password?: string, captchaToken?: string) => {
    setLoading(true);
    try {
      if (isRealSupabaseActive) {
        if (!password) {
          throw new Error("La contraseña es requerida.");
        }
        
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, captchaToken })
          });
          const resData = await res.json();
          
          if (res.ok && resData.success && resData.user) {
            const meta = resData.user.user_metadata || {};
            
            // Query ledger or existing localStorage profile to preserve saved cards & Auto-Pay settings
            let existingDbUser: any = null;
            const existingDbUserStr = localStorage.getItem("bz_supabase_db_user");
            if (existingDbUserStr) {
              try {
                const parsed = JSON.parse(existingDbUserStr);
                if (parsed.id === resData.user.id) {
                  existingDbUser = parsed;
                }
              } catch (e) {}
            }

            let ledgerUser: any = null;
            try {
              const usersList = JSON.parse(localStorage.getItem("bz_supabase_db_users_list") || "[]");
              ledgerUser = usersList.find((u: any) => u.id === resData.user.id);
            } catch (e) {}

            const realUser: User = {
              id: resData.user.id,
              email: resData.user.email || "",
              fullName: meta.fullName || meta.full_name || "Cliente Real",
              lastName: meta.lastName || meta.last_name || "",
              phone: meta.phone || "",
              idCard: meta.idCard || "",
              address: meta.address || "",
              deliveryMethod: meta.deliveryMethod || "gam",
              speedPreference: meta.speedPreference || "standard",
              suiteCode: meta.suiteCode || "BEZG-XX",
              createdAt: resData.user.created_at || new Date().toISOString(),
              savedCards: ledgerUser?.savedCards || existingDbUser?.savedCards || [],
              autoPayEnabled: ledgerUser?.autoPayEnabled ?? existingDbUser?.autoPayEnabled ?? false,
            };

            if (resData.session) {
              await supabase.auth.setSession({
                access_token: resData.session.access_token,
                refresh_token: resData.session.refresh_token,
              });
              if (typeof document !== "undefined") {
                document.cookie = `bz_auth_session=${resData.session.access_token};path=/;max-age=3600;samesite=lax`;
              }
            }

            setUser(realUser);
            localStorage.setItem("bz_supabase_db_user", JSON.stringify(realUser));
            
            // Sync with local users list
            try {
              const users = JSON.parse(localStorage.getItem("bz_supabase_db_users_list") || "[]");
              if (!users.some((u: any) => u.email === realUser.email)) {
                users.push(realUser);
                localStorage.setItem("bz_supabase_db_users_list", JSON.stringify(users));
              }
            } catch (e) {}
            return;
          } else {
            // Sin fallback inseguro: las credenciales se validan únicamente contra Supabase.
            const errObj = new Error(resData?.error || "Error al iniciar sesión.");
            (errObj as any).showCaptcha = !!resData?.showCaptcha;
            throw errObj;
          }
        } catch (fetchErr: any) {
          // Si Supabase no responde, se propaga el error (no se concede acceso desde caché local).
          throw fetchErr;
        }
      }
      
      // Fallback
      const loggedUser = await mockAuth.login(email);
      setUser(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: Partial<User> & { captchaToken?: string }, password?: string) => {
    setLoading(true);
    try {
      let finalSuiteCode = data.suiteCode || "BEZG-001";
      if (!data.suiteCode && typeof window !== "undefined") {
        try {
          const users = JSON.parse(localStorage.getItem("bz_supabase_db_users_list") || "[]");
          const nextNum = users.length + 1;
          finalSuiteCode = `BEZG-${String(nextNum).padStart(3, "0")}`;
        } catch (e) {}
      }

      if (isRealSupabaseActive) {
        if (!password || !data.email) {
          throw new Error("El correo y contraseña son obligatorios.");
        }
        
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: data.email,
            password: password,
            fullName: data.fullName,
            lastName: data.lastName,
            phone: data.phone,
            idCard: data.idCard,
            address: data.address,
            deliveryMethod: data.deliveryMethod,
            speedPreference: data.speedPreference,
            suiteCode: finalSuiteCode,
            captchaToken: data.captchaToken,
          })
        });
        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.error || "Error al crear cuenta.");
        }

        if (resData.session) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: resData.session.access_token,
            refresh_token: resData.session.refresh_token,
          });
          if (setSessionError) console.error("Error setting session", setSessionError);
        }
        
        if (resData.user) {
          const realUser: User = {
            id: resData.user.id,
            email: resData.user.email || "",
            fullName: data.fullName || "Cliente Real",
            lastName: data.lastName || "BreezeGo",
            phone: data.phone || "",
            idCard: data.idCard || "",
            address: data.address || "",
            deliveryMethod: data.deliveryMethod || "gam",
            speedPreference: data.speedPreference || "standard",
            suiteCode: resData.user.user_metadata?.suiteCode || finalSuiteCode,
            createdAt: resData.user.created_at || new Date().toISOString(),
          };

          const hasSession = !!resData.session;
          if (hasSession) {
            setUser(realUser);
            localStorage.setItem("bz_supabase_db_user", JSON.stringify(realUser));
          }
          
          // Store copy in local users list for admin dashboard CRM visibility
          try {
            const users = JSON.parse(localStorage.getItem("bz_supabase_db_users_list") || "[]");
            if (!users.some((u: any) => u.email === realUser.email)) {
              users.push(realUser);
              localStorage.setItem("bz_supabase_db_users_list", JSON.stringify(users));
            }
          } catch (e) {}
          return { needsVerification: !hasSession, suiteCode: realUser.suiteCode };
        }
        throw new Error("No se pudo registrar el usuario en Supabase.");
      }

      // Fallback
      const registeredUser = await mockAuth.signup({ ...data, suiteCode: finalSuiteCode });
      setUser(registeredUser);
      return { needsVerification: false, suiteCode: registeredUser.suiteCode };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isRealSupabaseActive) {
        await supabase.auth.signOut();
        localStorage.removeItem("bz_supabase_db_user");
        if (typeof document !== "undefined") {
          document.cookie = "bz_auth_session=;path=/;max-age=0;samesite=lax";
        }
      }
      await mockAuth.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
