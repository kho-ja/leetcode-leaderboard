"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UserList } from "@/components/users/user-list";
import { ErrorState } from "@/components/shared/error-state";
import { ErrorBoundary } from "react-error-boundary";

export default function UsersPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorState backLink="/dashboard" backText="Return to Dashboard" />
      }
    >
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions."
      >
        <Button asChild>
          <Link href="/dashboard/users/add">
            <UserPlus className="mr-2 h-4 w-4" /> Add User
          </Link>
        </Button>
      </PageHeader>
      <UserList />
    </ErrorBoundary>
  );
}
