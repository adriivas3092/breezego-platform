"use client";

import React, { useEffect, useState } from "react";
import { mockDb } from "@/lib/supabase";
import { Notification } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bell, CheckCircle, MailOpen } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await mockDb.notifications.select();
      setNotifications(data);
    } catch (err) {
      console.error("Error loading notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notId: string) => {
    await mockDb.notifications.markAsRead(notId);
    fetchNotifications();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-white flex items-center gap-2">
          Centro de Notificaciones
        </h1>
        <p className="text-slate-400 text-xs mt-1">Monitorea alertas automáticas del estado de tus fletes en tiempo real.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas y Avisos Recientes</CardTitle>
          <CardDescription>Historial cronológico de actualizaciones en tu casillero.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Buscando alertas activas...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No tienes alertas o notificaciones registradas.</div>
          ) : (
            <div className="divide-y divide-white/5 text-xs">
              {notifications.map((not) => (
                <div
                  key={not.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-all leading-relaxed ${
                    !not.isRead ? "bg-brand-cyan/5 border-l-2 border-brand-cyan" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      !not.isRead ? "bg-brand-cyan/15 text-brand-cyan" : "bg-white/5 text-slate-500"
                    }`}>
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <strong className={`font-bold block ${!not.isRead ? "text-brand-cyan" : "text-white"}`}>
                        {not.title}
                      </strong>
                      <p className="text-slate-300 leading-normal max-w-md">{not.message}</p>
                      <span className="text-[9px] text-slate-500 font-mono block">
                        {new Date(not.createdAt).toLocaleString("es-CR")}
                      </span>
                    </div>
                  </div>

                  {!not.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(not.id)}
                      className="h-8 rounded-lg text-slate-400 hover:text-brand-cyan"
                      title="Marcar como leída"
                    >
                      <MailOpen className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
