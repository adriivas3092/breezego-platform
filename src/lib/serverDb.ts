import { TilopayTransactionStatus } from "@/types";

interface GlobalPaymentStore {
  serverTransactions?: Record<string, {
    id: string;
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
  }>;
}

const globalStore = globalThis as unknown as GlobalPaymentStore;

if (!globalStore.serverTransactions) {
  globalStore.serverTransactions = {};
}

export const serverTransactions = globalStore.serverTransactions;
