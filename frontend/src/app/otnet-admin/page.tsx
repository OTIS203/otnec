"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRoot() {
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated as admin
    const token = localStorage.getItem("otnet_admin_token");
    if (token) {
      router.replace("/otnet-admin/dashboard");
    } else {
      router.replace("/otnet-admin/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 text-sm animate-pulse">Redirecting…</div>
    </div>
  );
}
