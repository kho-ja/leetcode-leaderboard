"use client";

import { useRouter } from "next/navigation";
import { useCreateUser } from "@/hooks/use-users";
import { UserForm } from "@/components/users/user-form";
import { CreateUserInput, UpdateUserInput } from "@/lib/validations/user";
import { UserFormWrapper } from "@/components/users/user-form-wrapper";

export default function AddUserPage() {
  const router = useRouter();
  const createMutation = useCreateUser();

  // Properly typed to match UserForm's onSubmit prop
  const handleSubmit = (data: CreateUserInput | UpdateUserInput) => {
    // Since we're in create mode, we can safely cast to CreateUserInput
    createMutation.mutate(data as CreateUserInput, {
      onSuccess: () => {
        router.push("/dashboard/users");
      },
    });
  };

  return (
    <UserFormWrapper title="Add New User">
      <UserForm
        isSubmitting={createMutation.isPending}
        onSubmit={handleSubmit}
        mode="create"
      />
    </UserFormWrapper>
  );
}
