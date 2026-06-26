import { User, SavedCard, Package, TrackingEvent, Invoice, Notification, PackageStatus, BusinessSettings, TilopayTransaction, TilopayTransactionStatus } from "@/types";

// Check if window is defined for Server Side Rendering (SSR) safety in Next.js
const isClient = typeof window !== "undefined";

// Simulated Latency
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// INITIAL SEED DATA
const defaultUser: User = {
  id: "user_uuid_12345",
  email: "cliente@breezego.cr",
  fullName: "Eduardo",
  lastName: "Mora Solano",
  phone: "+506 8899-4455",
  idCard: "1-1234-0567",
  address: "Sabanilla, Montes de Oca, San José. 100m Este de la Iglesia.",
  deliveryMethod: "gam",
  speedPreference: "standard",
  suiteCode: "BEZG-001",
  createdAt: new Date().toISOString(),
  savedCards: [],
  autoPayEnabled: false,
};

const defaultPackages: Package[] = [];

const defaultTrackingEvents: TrackingEvent[] = [];

const defaultInvoices: Invoice[] = [];

const defaultNotifications: Notification[] = [];

// INITIAL SEED DATA CONTINUED (FOR ADMIN AND MULTI-USERS)
const defaultSettings: BusinessSettings = {
  miamiLaunchRate: 6000,
  miamiRegularRate: 7000,
  deliveryGamFee: 3500,
  deliveryCartagoAlajuelaFee: 4500,
  deliveryRuralFee: 5000,
  boxMediumFee: 15.00,
  boxLargeFee: 20.00,
  boxXlargeFee: 25.00,
  boxMediumFeeRegular: 18.00,
  boxLargeFeeRegular: 23.00,
  boxXlargeFeeRegular: 28.00,
};

const defaultUsersList: User[] = [];

// DATA STORES IN LOCALSTORAGE FOR REAL-TIME VALUE OVERRIDES
const KEYS = {
  USER: "bz_supabase_auth_user",
  PACKAGES: "bz_supabase_db_packages",
  EVENTS: "bz_supabase_db_events",
  INVOICES: "bz_supabase_db_invoices",
  NOTIFICATIONS: "bz_supabase_db_notifications",
  SETTINGS: "bz_supabase_db_settings",
  USERS_LIST: "bz_supabase_db_users_list",
  TRANSACTIONS: "bz_supabase_db_transactions"
};

// Seed database on client load
export function initializeMockDb() {
  if (!isClient) return;

  // Clear existing mock values if present in localStorage to start "at 0"
  const pkgs = localStorage.getItem(KEYS.PACKAGES);
  if (pkgs && pkgs.includes("pkg_1")) {
    localStorage.setItem(KEYS.PACKAGES, JSON.stringify([]));
  }
  const invs = localStorage.getItem(KEYS.INVOICES);
  if (invs && invs.includes("inv_1")) {
    localStorage.setItem(KEYS.INVOICES, JSON.stringify([]));
  }
  const events = localStorage.getItem(KEYS.EVENTS);
  if (events && events.includes("evt_1_1")) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify([]));
  }
  const notifs = localStorage.getItem(KEYS.NOTIFICATIONS);
  if (notifs && notifs.includes("not_1")) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
  const users = localStorage.getItem(KEYS.USERS_LIST);

  if (!localStorage.getItem(KEYS.USER)) {
    localStorage.setItem(KEYS.USER, JSON.stringify(defaultUser));
  }
  if (!localStorage.getItem(KEYS.PACKAGES)) {
    localStorage.setItem(KEYS.PACKAGES, JSON.stringify(defaultPackages));
  }
  if (!localStorage.getItem(KEYS.EVENTS)) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(defaultTrackingEvents));
  }
  if (!localStorage.getItem(KEYS.INVOICES)) {
    localStorage.setItem(KEYS.INVOICES, JSON.stringify(defaultInvoices));
  }
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(defaultNotifications));
  }
  const existingSettingsStr = localStorage.getItem(KEYS.SETTINGS);
  if (!existingSettingsStr) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
  } else {
    try {
      const parsed = JSON.parse(existingSettingsStr);
      // Migration: Ensure the rates are always correctly set to 6000 and 7000
      parsed.miamiLaunchRate = 6000;
      parsed.miamiRegularRate = 7000;
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed));
    } catch (e) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
  }
  if (!localStorage.getItem(KEYS.USERS_LIST)) {
    localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(defaultUsersList));
  }
  if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
  }
}

// SIMULATED AUTH CONTROLLER
export const mockAuth = {
  getCurrentUser: async (): Promise<User | null> => {
    await delay(300);
    if (!isClient) return null;
    const stored = localStorage.getItem(KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  },

  login: async (email: string): Promise<User> => {
    await delay(800);
    initializeMockDb();
    if (!isClient) return defaultUser;

    const existingUserStr = localStorage.getItem(KEYS.USER);
    if (existingUserStr) {
      const user = JSON.parse(existingUserStr);
      user.email = email;
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      return user;
    }

    const newUser = { ...defaultUser, email };
    localStorage.setItem(KEYS.USER, JSON.stringify(newUser));
    return newUser;
  },

  signup: async (data: Partial<User>): Promise<User> => {
    await delay(1000);
    initializeMockDb();
    
    let suiteCode = "BEZG-001";
    if (isClient) {
      try {
        const users = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
        const nextNum = users.length + 1;
        suiteCode = `BEZG-${String(nextNum).padStart(3, "0")}`;
      } catch (e) {}
    }
    
    const newUser: User = {
      id: `user_uuid_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email || "anon@breezego.cr",
      fullName: data.fullName || "Cliente",
      lastName: data.lastName || "BreezeGo",
      phone: data.phone || "+506 8800-0000",
      idCard: data.idCard || "1-0000-0000",
      address: data.address || "San José, Costa Rica",
      deliveryMethod: data.deliveryMethod || "gam",
      speedPreference: data.speedPreference || "standard",
      suiteCode,
      createdAt: new Date().toISOString(),
    };

    if (isClient) {
      localStorage.setItem(KEYS.USER, JSON.stringify(newUser));
      
      // Add to users list
      try {
        const users = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
        users.push(newUser);
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
      } catch (e) {
        console.error("Error updating users list", e);
      }
      
      // Inject some initial empty/welcoming structures
      localStorage.setItem(KEYS.PACKAGES, JSON.stringify([]));
      localStorage.setItem(KEYS.EVENTS, JSON.stringify([]));
      localStorage.setItem(KEYS.INVOICES, JSON.stringify([]));
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([
        {
          id: `welcome_not_${Date.now()}`,
          userId: newUser.id,
          title: "Bienvenido a BreezeGo",
          message: `Tu casillero Miami ha sido activado con éxito. Usa tu suite ${suiteCode} para realizar compras en USA.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ]));
    }
    
    return newUser;
  },

  logout: async (): Promise<void> => {
    await delay(200);
    if (isClient) {
      localStorage.removeItem(KEYS.USER);
    }
  }
};

// SIMULATED DATABASE CLIENT (CRUD OVER localStorage)
export const mockDb = {
  // 1. PACKAGES QUERY & MUTATION
  packages: {
    select: async (): Promise<Package[]> => {
      await delay(400);
      initializeMockDb();
      if (!isClient) return defaultPackages;
      const data = localStorage.getItem(KEYS.PACKAGES);
      return data ? JSON.parse(data) : [];
    },
    
    insert: async (pkg: Omit<Package, "id" | "createdAt">): Promise<Package> => {
      await delay(500);
      initializeMockDb();
      
      const newPkg: Package = {
        ...pkg,
        id: `pkg_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      if (isClient) {
        const pkgs = JSON.parse(localStorage.getItem(KEYS.PACKAGES) || "[]");
        pkgs.unshift(newPkg);
        localStorage.setItem(KEYS.PACKAGES, JSON.stringify(pkgs));
        
        // Auto-inject initial prealert tracking event
        const events = JSON.parse(localStorage.getItem(KEYS.EVENTS) || "[]");
        events.unshift({
          id: `evt_pre_${Date.now()}`,
          packageId: newPkg.id,
          status: "prealerted",
          message: `Prealerta de paquete registrada por el cliente (${newPkg.vendor} - ${newPkg.trackingNumber}).`,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
      }
      
      return newPkg;
    },

    updateStatus: async (pkgId: string, status: PackageStatus, additionalDetails?: {
      weight?: number;
      latitude?: number;
      longitude?: number;
      driverName?: string;
      driverPhone?: string;
    }): Promise<Package | null> => {
      await delay(500);
      initializeMockDb();
      
      if (!isClient) return null;
      const pkgs: Package[] = JSON.parse(localStorage.getItem(KEYS.PACKAGES) || "[]");
      const pkgIndex = pkgs.findIndex(p => p.id === pkgId);
      
      if (pkgIndex === -1) return null;
      
      const targetPkg = pkgs[pkgIndex];
      targetPkg.status = status;
      
      if (additionalDetails?.weight !== undefined) {
        targetPkg.weight = additionalDetails.weight;
      }
      
      if (status === "received" && !targetPkg.miamiReceivedAt) {
        targetPkg.miamiReceivedAt = new Date().toISOString();
      }
      if (status === "in_transit" && !targetPkg.sjoArrivedAt) {
        targetPkg.sjoArrivedAt = new Date().toISOString();
      }
      if (status === "delivered" && !targetPkg.deliveredAt) {
        targetPkg.deliveredAt = new Date().toISOString();
      }
      
      pkgs[pkgIndex] = targetPkg;
      localStorage.setItem(KEYS.PACKAGES, JSON.stringify(pkgs));
      
      // Append tracking timeline event
      const events: TrackingEvent[] = JSON.parse(localStorage.getItem(KEYS.EVENTS) || "[]");
      
      let message = `Actualización de estado: ${status.replace(/_/g, ' ').toUpperCase()}`;
      if (status === "received") message = `Recibido y pesado en bodegas Miami. Peso chargeable: ${targetPkg.weight} Kg.`;
      if (status === "in_transit") message = `Embarcado en flete aéreo internacional consolidado SJO.`;
      if (status === "customs") message = `Arribo a aduana SJO. Trámites arancelarios en verificación fiscal.`;
      if (status === "out_for_delivery") message = `En ruta de distribución local GAM con chofer asignado.`;
      if (status === "delivered") message = `Paquete entregado físicamente con firma de recibido.`;

      events.unshift({
        id: `evt_update_${Date.now()}`,
        packageId: pkgId,
        status,
        message,
        latitude: additionalDetails?.latitude,
        longitude: additionalDetails?.longitude,
        driverName: additionalDetails?.driverName,
        driverPhone: additionalDetails?.driverPhone,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
      
      // Auto-trigger invoice if received in Miami
      if (status === "received") {
        const invoices: Invoice[] = JSON.parse(localStorage.getItem(KEYS.INVOICES) || "[]");
        const alreadyHasInv = invoices.some(i => i.packageId === pkgId);
        if (!alreadyHasInv) {
          const fleteCost = Number((targetPkg.weight * 4.25).toFixed(2)); // $4.25 per lb flete base
          const taxesCost = Number((Math.random() * 20 + 5).toFixed(2));
          const deliveryCost = 5.0;
          const totalCostUsd = fleteCost + taxesCost + deliveryCost;
          const totalCostCrc = Number((totalCostUsd * 515).toFixed(2));
          
          invoices.unshift({
            id: `inv_${Math.random().toString(36).substr(2, 9)}`,
            packageId,
            fleteCost,
            taxesCost,
            deliveryCost,
            totalCostUsd,
            totalCostCrc,
            isPaid: false,
            createdAt: new Date().toISOString()
          });
          localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
        }
      }
      
      // Trigger Notification
      const notifications: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || "[]");
      notifications.unshift({
        id: `not_update_${Date.now()}`,
        userId: targetPkg.userId,
        title: `Paquete: ${status.replace(/_/g, ' ').toUpperCase()}`,
        message: `Tu paquete de ${targetPkg.vendor} (${targetPkg.trackingNumber}) ha cambiado a estado: ${status.replace(/_/g, ' ')}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));

      return targetPkg;
    }
  },

  // 2. TRACKING EVENTS QUERY
  events: {
    selectByPackageId: async (packageId: string): Promise<TrackingEvent[]> => {
      await delay(200);
      initializeMockDb();
      if (!isClient) return defaultTrackingEvents.filter(e => e.packageId === packageId);
      const data: TrackingEvent[] = JSON.parse(localStorage.getItem(KEYS.EVENTS) || "[]");
      return data.filter(e => e.packageId === packageId).reverse(); // chronological order
    }
  },

  // 3. INVOICES QUERY & PAY
  invoices: {
    select: async (): Promise<Invoice[]> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return defaultInvoices;
      const data = localStorage.getItem(KEYS.INVOICES);
      return data ? JSON.parse(data) : [];
    },
    
    pay: async (invId: string): Promise<boolean> => {
      await delay(600);
      initializeMockDb();
      if (!isClient) return false;
      
      const invoices: Invoice[] = JSON.parse(localStorage.getItem(KEYS.INVOICES) || "[]");
      const invIndex = invoices.findIndex(i => i.id === invId);
      
      if (invIndex === -1) return false;
      
      invoices[invIndex].isPaid = true;
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
      
      // Post notification
      const notifications: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || "[]");
      notifications.unshift({
        id: `not_pay_${Date.now()}`,
        userId: "user_uuid_12345",
        title: "Pago de Flete Confirmado",
        message: `El cobro por $${invoices[invIndex].totalCostUsd} (₡${invoices[invIndex].totalCostCrc}) ha sido procesado. Paquete listo para liberación y despacho.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));

      return true;
    }
  },

  // 4. NOTIFICATIONS QUERY & READ
  notifications: {
    select: async (): Promise<Notification[]> => {
      await delay(200);
      initializeMockDb();
      if (!isClient) return defaultNotifications;
      const data = localStorage.getItem(KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    },
    
    markAsRead: async (notId: string): Promise<void> => {
      if (!isClient) return;
      const notifications: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || "[]");
      const notIndex = notifications.findIndex(n => n.id === notId);
      if (notIndex !== -1) {
        notifications[notIndex].isRead = true;
        localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      }
    }
  },

  // 5. USERS LEDGER
  users: {
    select: async (): Promise<User[]> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return defaultUsersList;
      const data = localStorage.getItem(KEYS.USERS_LIST);
      return data ? JSON.parse(data) : [];
    },
    
    update: async (userId: string, data: Partial<User>): Promise<User | null> => {
      await delay(400);
      initializeMockDb();
      if (!isClient) return null;
      
      const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
      let idx = users.findIndex(u => u.id === userId);
      if (idx === -1) {
        const newUser: User = {
          id: userId,
          email: data.email || "anon@breezego.cr",
          fullName: data.fullName || "Cliente",
          lastName: data.lastName || "BreezeGo",
          phone: data.phone || "+506 8800-0000",
          idCard: data.idCard || "1-0000-0000",
          address: data.address || "San José, Costa Rica",
          deliveryMethod: data.deliveryMethod || "gam",
          speedPreference: data.speedPreference || "standard",
          suiteCode: data.suiteCode || "BEZG-001",
          createdAt: new Date().toISOString(),
          savedCards: [],
          autoPayEnabled: false,
        };
        users.push(newUser);
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
        return newUser;
      }
      
      users[idx] = { ...users[idx], ...data };
      localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
      
      // Sync with active auth user if self
      const currentUserStr = localStorage.getItem(KEYS.USER);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id === userId) {
          localStorage.setItem(KEYS.USER, JSON.stringify({ ...currentUser, ...data }));
        }
      }
      
      return users[idx];
    },

    delete: async (userId: string): Promise<boolean> => {
      await delay(400);
      initializeMockDb();
      if (!isClient) return false;
      
      const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
      const filtered = users.filter(u => u.id !== userId);
      localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(filtered));
      return true;
    },

    addCard: async (userId: string, card: Omit<SavedCard, "id" | "token">): Promise<SavedCard | null> => {
      await delay(400);
      initializeMockDb();
      if (!isClient) return null;

      const newCard: SavedCard = {
        ...card,
        id: `card_${Math.random().toString(36).substr(2, 9)}`,
        token: `tilo_tok_${Math.random().toString(36).substr(2, 12).toUpperCase()}`
      };

      const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
      let idx = users.findIndex(u => u.id === userId);
      const currentUserStr = localStorage.getItem(KEYS.USER);
      let currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

      const updateCards = (cards: SavedCard[] = []) => {
        if (newCard.isDefault) {
          cards = cards.map(c => ({ ...c, isDefault: false }));
        }
        cards.push(newCard);
        if (cards.length === 1) {
          cards[0].isDefault = true;
          newCard.isDefault = true;
        }
        return cards;
      };

      if (idx === -1) {
        // Create user entry in the ledger
        const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
        const activeDbUser = activeDbUserStr ? JSON.parse(activeDbUserStr) : null;
        const newUserEntry: User = activeDbUser && activeDbUser.id === userId
          ? activeDbUser
          : {
              id: userId,
              email: "user@breezego.net",
              fullName: "Usuario BreezeGo",
              phone: "",
              idCard: "",
              address: "",
              deliveryMethod: "gam",
              speedPreference: "standard",
              suiteCode: "BEZG-XX",
              createdAt: new Date().toISOString(),
              savedCards: [],
              autoPayEnabled: false,
            };
        users.push(newUserEntry);
        idx = users.length - 1;
      }

      if (idx !== -1) {
        users[idx].savedCards = updateCards(users[idx].savedCards || []);
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
      }

      if (currentUser && currentUser.id === userId) {
        currentUser.savedCards = updateCards(currentUser.savedCards || []);
        localStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
      } else if (!currentUser && userId === "user_uuid_12345") {
        const defaultUserStr = localStorage.getItem(KEYS.USER);
        if (defaultUserStr) {
          const du = JSON.parse(defaultUserStr);
          du.savedCards = updateCards(du.savedCards || []);
          localStorage.setItem(KEYS.USER, JSON.stringify(du));
        }
      }

      // Sync active Supabase user session store
      const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
      if (activeDbUserStr) {
        const activeDbUser = JSON.parse(activeDbUserStr);
        if (activeDbUser.id === userId) {
          activeDbUser.savedCards = updateCards(activeDbUser.savedCards || []);
          localStorage.setItem("bz_supabase_db_user", JSON.stringify(activeDbUser));
        }
      }

      return newCard;
    },

    deleteCard: async (userId: string, cardId: string): Promise<boolean> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return false;

      const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
      let idx = users.findIndex(u => u.id === userId);
      const currentUserStr = localStorage.getItem(KEYS.USER);
      let currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

      const filterCards = (cards: SavedCard[] = []) => {
        const remaining = cards.filter(c => c.id !== cardId);
        if (remaining.length > 0 && !remaining.some(c => c.isDefault)) {
          remaining[0].isDefault = true;
        }
        return remaining;
      };

      if (idx === -1) {
        // Create user entry in the ledger
        const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
        const activeDbUser = activeDbUserStr ? JSON.parse(activeDbUserStr) : null;
        const newUserEntry: User = activeDbUser && activeDbUser.id === userId
          ? activeDbUser
          : {
              id: userId,
              email: "user@breezego.net",
              fullName: "Usuario",
              lastName: "BreezeGo",
              phone: "",
              idCard: "",
              address: "",
              deliveryMethod: "gam",
              speedPreference: "standard",
              suiteCode: "BEZG-XX",
              createdAt: new Date().toISOString(),
              savedCards: [],
              autoPayEnabled: false,
            };
        users.push(newUserEntry);
        idx = users.length - 1;
      }

      if (idx !== -1) {
        users[idx].savedCards = filterCards(users[idx].savedCards || []);
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
      }

      if (currentUser && currentUser.id === userId) {
        currentUser.savedCards = filterCards(currentUser.savedCards || []);
        localStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
      } else if (!currentUser && userId === "user_uuid_12345") {
        const defaultUserStr = localStorage.getItem(KEYS.USER);
        if (defaultUserStr) {
          const du = JSON.parse(defaultUserStr);
          du.savedCards = filterCards(du.savedCards || []);
          localStorage.setItem(KEYS.USER, JSON.stringify(du));
        }
      }

      // Sync active Supabase user session store
      const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
      if (activeDbUserStr) {
        const activeDbUser = JSON.parse(activeDbUserStr);
        if (activeDbUser.id === userId) {
          activeDbUser.savedCards = filterCards(activeDbUser.savedCards || []);
          localStorage.setItem("bz_supabase_db_user", JSON.stringify(activeDbUser));
        }
      }

      return true;
    },

    setDefaultCard: async (userId: string, cardId: string): Promise<boolean> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return false;

      const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
      let idx = users.findIndex(u => u.id === userId);
      const currentUserStr = localStorage.getItem(KEYS.USER);
      let currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

      const makeDefault = (cards: SavedCard[] = []) => {
        return cards.map(c => ({
          ...c,
          isDefault: c.id === cardId
        }));
      };

      if (idx === -1) {
        // Create user entry in the ledger
        const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
        const activeDbUser = activeDbUserStr ? JSON.parse(activeDbUserStr) : null;
        const newUserEntry: User = activeDbUser && activeDbUser.id === userId
          ? activeDbUser
          : {
              id: userId,
              email: "user@breezego.net",
              fullName: "Usuario",
              lastName: "BreezeGo",
              phone: "",
              idCard: "",
              address: "",
              deliveryMethod: "gam",
              speedPreference: "standard",
              suiteCode: "BEZG-XX",
              createdAt: new Date().toISOString(),
              savedCards: [],
              autoPayEnabled: false,
            };
        users.push(newUserEntry);
        idx = users.length - 1;
      }

      if (idx !== -1) {
        users[idx].savedCards = makeDefault(users[idx].savedCards || []);
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
      }

      if (currentUser && currentUser.id === userId) {
        currentUser.savedCards = makeDefault(currentUser.savedCards || []);
        localStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
      } else if (!currentUser && userId === "user_uuid_12345") {
        const defaultUserStr = localStorage.getItem(KEYS.USER);
        if (defaultUserStr) {
          const du = JSON.parse(defaultUserStr);
          du.savedCards = makeDefault(du.savedCards || []);
          localStorage.setItem(KEYS.USER, JSON.stringify(du));
        }
      }

      // Sync active Supabase user session store
      const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
      if (activeDbUserStr) {
        const activeDbUser = JSON.parse(activeDbUserStr);
        if (activeDbUser.id === userId) {
          activeDbUser.savedCards = makeDefault(activeDbUser.savedCards || []);
          localStorage.setItem("bz_supabase_db_user", JSON.stringify(activeDbUser));
        }
      }

      return true;
    },

    toggleAutoPay: async (userId: string, enabled: boolean): Promise<boolean> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return false;

      const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS_LIST) || "[]");
      let idx = users.findIndex(u => u.id === userId);
      const currentUserStr = localStorage.getItem(KEYS.USER);
      let currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

      if (idx === -1) {
        // Create user entry in the ledger
        const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
        const activeDbUser = activeDbUserStr ? JSON.parse(activeDbUserStr) : null;
        const newUserEntry: User = activeDbUser && activeDbUser.id === userId
          ? activeDbUser
          : {
              id: userId,
              email: "user@breezego.net",
              fullName: "Usuario",
              lastName: "BreezeGo",
              phone: "",
              idCard: "",
              address: "",
              deliveryMethod: "gam",
              speedPreference: "standard",
              suiteCode: "BEZG-XX",
              createdAt: new Date().toISOString(),
              savedCards: [],
              autoPayEnabled: false,
            };
        users.push(newUserEntry);
        idx = users.length - 1;
      }

      if (idx !== -1) {
        users[idx].autoPayEnabled = enabled;
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(users));
      }

      if (currentUser && currentUser.id === userId) {
        currentUser.autoPayEnabled = enabled;
        localStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
      } else if (!currentUser && userId === "user_uuid_12345") {
        const defaultUserStr = localStorage.getItem(KEYS.USER);
        if (defaultUserStr) {
          const du = JSON.parse(defaultUserStr);
          du.autoPayEnabled = enabled;
          localStorage.setItem(KEYS.USER, JSON.stringify(du));
        }
      }

      // Sync active Supabase user session store
      const activeDbUserStr = localStorage.getItem("bz_supabase_db_user");
      if (activeDbUserStr) {
        const activeDbUser = JSON.parse(activeDbUserStr);
        if (activeDbUser.id === userId) {
          activeDbUser.autoPayEnabled = enabled;
          localStorage.setItem("bz_supabase_db_user", JSON.stringify(activeDbUser));
        }
      }

      return true;
    }
  },

  // 6. BUSINESS SETTINGS / TARIFFS
  settings: {
    get: async (): Promise<BusinessSettings> => {
      await delay(200);
      initializeMockDb();
      if (!isClient) return defaultSettings;
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : defaultSettings;
    },
    
    update: async (newSettings: Partial<BusinessSettings>): Promise<BusinessSettings> => {
      await delay(450);
      initializeMockDb();
      if (!isClient) return defaultSettings;
      
      const current = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(defaultSettings));
      const updated = { ...current, ...newSettings };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    }
  },
  
  invoices: {
    select: async (): Promise<Invoice[]> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return defaultInvoices;
      const data = localStorage.getItem(KEYS.INVOICES);
      return data ? JSON.parse(data) : [];
    },
    
    pay: async (invId: string): Promise<boolean> => {
      await delay(600);
      initializeMockDb();
      if (!isClient) return false;
      
      const invoices: Invoice[] = JSON.parse(localStorage.getItem(KEYS.INVOICES) || "[]");
      const invIndex = invoices.findIndex(i => i.id === invId);
      
      if (invIndex === -1) return false;
      
      invoices[invIndex].isPaid = true;
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
      
      // Post notification
      const notifications: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || "[]");
      notifications.unshift({
        id: `not_pay_${Date.now()}`,
        userId: "user_uuid_12345",
        title: "Pago de Flete Confirmado",
        message: `El cobro por $${invoices[invIndex].totalCostUsd} (₡${invoices[invIndex].totalCostCrc}) ha sido procesado. Paquete listo para liberación y despacho.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));

      return true;
    },

    updatePaidStatus: async (invId: string, isPaid: boolean): Promise<boolean> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return false;
      
      const invoices: Invoice[] = JSON.parse(localStorage.getItem(KEYS.INVOICES) || "[]");
      const idx = invoices.findIndex(i => i.id === invId);
      if (idx === -1) return false;
      
      invoices[idx].isPaid = isPaid;
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
      
      // Post notification if marked as paid
      if (isPaid) {
        const notifications: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || "[]");
        notifications.unshift({
          id: `not_pay_man_${Date.now()}`,
          userId: "user_uuid_12345", // default mock user
          title: "Pago de Flete Confirmado (Manual)",
          message: `El cobro por $${invoices[idx].totalCostUsd} (₡${invoices[idx].totalCostCrc}) ha sido marcado como PAGADO manualmente por el Administrador.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      }
      
      return true;
    }
  },
  transactions: {
    select: async (): Promise<TilopayTransaction[]> => {
      await delay(200);
      initializeMockDb();
      if (!isClient) return [];
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    },
    
    insert: async (tx: TilopayTransaction): Promise<TilopayTransaction> => {
      await delay(300);
      initializeMockDb();
      if (isClient) {
        const txs = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || "[]");
        txs.unshift(tx);
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
      }
      return tx;
    },
    
    updateStatus: async (txId: string, status: TilopayTransactionStatus, details?: Partial<TilopayTransaction>): Promise<boolean> => {
      await delay(300);
      initializeMockDb();
      if (!isClient) return false;
      
      const txs: TilopayTransaction[] = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || "[]");
      const idx = txs.findIndex(t => t.id === txId);
      if (idx === -1) return false;
      
      txs[idx] = { 
        ...txs[idx], 
        status, 
        ...details, 
        updatedAt: new Date().toISOString() 
      };
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
      return true;
    }
  }
};
