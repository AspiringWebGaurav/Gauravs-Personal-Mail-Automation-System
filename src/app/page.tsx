"use client";

import { AppShell } from "@/components/layout/AppShell";
import dynamic from "next/dynamic";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

const HomePage = dynamic(() => import("@/components/pages/HomePage"), {
  loading: () => <GlobalLoader />,
});

export default function Page() {
  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
}
