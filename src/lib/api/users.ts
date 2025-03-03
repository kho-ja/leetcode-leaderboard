import { ApiError, CreateUserPayload, UpdateUserPayload, User } from "@/types";

/**
 * Configuration for API requests
 */
const API_CONFIG = {
  baseHeaders: {
    "Content-Type": "application/json",
  },
  endpoints: {
    users: "/api/users",
  },
};

/**
 * Handles API response errors consistently
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok) {
    // Extract error information from the response
    const error: ApiError = {
      message: data.message || "An error occurred",
      errors: data.errors,
      status: response.status,
    };
    
    throw new Error(error.message);
  }
  
  return data;
}

/**
 * User API services
 */
export const userService = {
  /**
   * Get all users
   */
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(API_CONFIG.endpoints.users);
      return handleResponse<User[]>(response);
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  getUser: async (id: string): Promise<User> => {
    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${id}`);
      return handleResponse<User>(response);
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new user
   */
  createUser: async (userData: CreateUserPayload): Promise<{ user: User; message: string }> => {
    try {
      const response = await fetch(API_CONFIG.endpoints.users, {
        method: "POST",
        headers: API_CONFIG.baseHeaders,
        body: JSON.stringify(userData),
      });
      return handleResponse<{ user: User; message: string }>(response);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  /**
   * Update an existing user
   */
  updateUser: async (id: string, userData: UpdateUserPayload): Promise<{ user: User; message: string }> => {
    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${id}`, {
        method: "PUT",
        headers: API_CONFIG.baseHeaders,
        body: JSON.stringify(userData),
      });
      return handleResponse<{ user: User; message: string }>(response);
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${id}`, {
        method: "DELETE",
      });
      return handleResponse<{ message: string }>(response);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  },
};
