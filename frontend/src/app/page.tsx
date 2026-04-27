"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getDashboardPath } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const role = getRole();
    if (role) {
      router.replace(getDashboardPath(role));
    } else {
      router.replace("/login");
    }
  }, [router]);
  return null;
}
