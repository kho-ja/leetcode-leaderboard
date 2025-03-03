"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ReactNode } from "react";

interface UserFormWrapperProps {
  title: string;
  children: ReactNode;
}

export function UserFormWrapper({ title, children }: UserFormWrapperProps) {
  return (
    <div>
      <PageHeader title={title}>
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  );
}
