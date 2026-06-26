"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function TrackingSearch() {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");

  const handleTrackingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      router.push(`/tracking?code=${encodeURIComponent(trackingCode.trim())}`);
    }
  };

  return (
    <form onSubmit={handleTrackingSearch} className="max-w-md mx-auto mt-10 p-2 rounded-2xl glass-panel flex gap-2">
      <Input
        type="text"
        placeholder="Introduce tu código de rastreo (e.g. BZ-506-SJO)..."
        value={trackingCode}
        onChange={(e) => setTrackingCode(e.target.value)}
        className="bg-transparent border-0 focus:ring-0 h-10 text-xs px-2"
      />
      <Button type="submit" size="sm" className="h-10 px-4 rounded-xl flex items-center gap-1 shrink-0">
        Rastrear
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
