import {
    useMutation,
    useQuery,
    useQueryClient,
    UseMutationResult,
    UseQueryResult,
} from "@tanstack/react-query";
import { CreateUserPayload, UpdateUserPayload, User } from "@/types";
import { toast } from "sonner";
import { 
    getUsers, 
    getUser, 
    createUser, 
    updateUser, 
    deleteUser 
} from "@/lib/actions/user-actions";

/**
 * Hook to fetch all users
 */
export function useUsers(): UseQueryResult<User[], Error> {
    return useQuery({
        queryKey: ["users"],
        queryFn: () => getUsers(),
    });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: string): UseQueryResult<User, Error> {
    return useQuery({
        queryKey: ["user", id],
        queryFn: () => getUser(id),
        enabled: !!id,
    });
}

/**
 * Hook to create a new user
 */
export function useCreateUser(): UseMutationResult<
    { user: User; message: string },
    Error,
    CreateUserPayload
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userData: CreateUserPayload) => createUser(userData),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Success", {
                description: data.message || "User created successfully",
            });
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to create user",
            });
        },
    });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser(): UseMutationResult<
    { user: User; message: string },
    Error,
    { id: string; userData: UpdateUserPayload }
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, userData }) => updateUser(id, userData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["user", variables.id] });
            toast.success("Success", {
                description: data.message || "User updated successfully",
            });
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to update user",
            });
        },
    });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser(): UseMutationResult<
    { message: string },
    Error,
    string
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteUser(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Success", {
                description: data.message || "User deleted successfully",
            });
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to delete user",
            });
        },
    });
}
