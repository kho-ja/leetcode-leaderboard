"use client";

import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useUpdateUser } from "@/hooks/use-users";
import { UserForm } from "@/components/users/user-form";
import { UpdateUserInput } from "@/lib/validations/user";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { UserFormWrapper } from "@/components/users/user-form-wrapper";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EditUserPage() {
  const userId = useParams().id as string;

  const router = useRouter();

  // Get user data
  const { data: user, isLoading, error } = useUser(userId);

  // Update user mutation
  const updateMutation = useUpdateUser();

  const handleSubmit = async (data: UpdateUserInput) => {
    const userData = {
      name: data.name,
      email: data.email,
      ...(data.password ? { password: data.password } : {}),
    };

    await updateMutation.mutate(
      { id: userId, userData },
      {
        onSuccess: () => {
          router.push("/dashboard/users");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <UserFormWrapper title="Edit User">
        <div className="border rounded-lg p-6 space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </UserFormWrapper>
    );
  }

  if (error || !user) {
    return (
      <UserFormWrapper title="Edit User">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || "User not found or could not be loaded."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/users">Return to Users</Link>
        </Button>
      </UserFormWrapper>
    );
  }

  return (
    <UserFormWrapper title="Edit User">
      <UserForm
        user={user}
        isSubmitting={updateMutation.isPending}
        onSubmit={handleSubmit}
        mode="edit"
      />
    </UserFormWrapper>
  );
}
