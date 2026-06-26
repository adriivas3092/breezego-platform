export interface SavedCard {
  id: string;
  brand: "visa" | "mastercard" | "amex" | "other";
  last4: string;
  expDate: string;
  isDefault: boolean;
  token: string;
  holderName: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  lastName: string;
  phone: string;
  idCard: string;
  address: string;
  deliveryMethod: "gam" | "rural" | "locker";
  speedPreference: "standard" | "express";
  suiteCode: string;
  createdAt: string;
  savedCards?: SavedCard[];
  autoPayEnabled?: boolean;
}

export type PackageStatus =
  | "prealerted"
  | "received"
  | "in_transit"
  | "customs"
  | "out_for_delivery"
  | "delivered";

export interface Package {
  id: string;
  userId?: string | null;
  trackingNumber: string;
  vendor: string;
  description: string;
  weight: number;
  status: PackageStatus;
  shippingMode: "air" | "sea";
  declaredValue?: number;
  category?: string;
  invoiceUrl?: string;
  miamiReceivedAt?: string;
  sjoArrivedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  wantsDelivery?: boolean;
  wantsInsurance?: boolean;
}

export interface TrackingEvent {
  id: string;
  packageId: string;
  status: PackageStatus;
  message: string;
  latitude?: number;
  longitude?: number;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  packageId: string;
  fleteCost: number;
  taxesCost: number;
  deliveryCost: number;
  totalCostUsd: number;
  totalCostCrc: number;
  isPaid: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CalculatorInput {
  origin: "miami" | "china" | "europe";
  weight: number;
  unit: "lbs" | "kgs";
  category: "general" | "electronics" | "clothing" | "shoes" | "cosmetics" | "carparts" | "books";
  value: number;
  delivery: boolean;
  personalShopper: boolean; // personal shopper service checkbox
  wantsInsurance?: boolean;
}

export interface CalculatorOutput {
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  freightFee: number;
  cifValue: number;       // base value for CR customs taxes
  customsDai: number;     // DAI + Selective consumption
  customsIva: number;     // 13% IVA
  customsTax: number;     // total taxes sum
  deliveryFee: number;
  insuranceFee: number;
  personalShopperFee: number; // 5% commission of FOB
  totalUsd: number;
  totalCrc: number;
}

export interface BusinessSettings {
  miamiLaunchRate: number;
  miamiRegularRate: number;
  deliveryGamFee: number;
  deliveryCartagoAlajuelaFee: number;
  deliveryRuralFee: number;
  boxMediumFee: number;
  boxLargeFee: number;
  boxXlargeFee: number;
  boxMediumFeeRegular: number;
  boxLargeFeeRegular: number;
  boxXlargeFeeRegular: number;
}

export type TilopayTransactionStatus = "pending" | "paid" | "rejected" | "refunded";

export interface TilopayTransaction {
  id: string; // internal order transaction ID (e.g. tx_123456)
  invoiceId: string;
  amountUsd: number;
  amountCrc: number;
  status: TilopayTransactionStatus;
  tilopayTxId?: string;
  paymentMethod?: string;
  authCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}


