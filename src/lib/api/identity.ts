import { api } from "./client";
import type { UserResponse } from "./types";

export const identityApi = {
  me: () => api.get<UserResponse>("/identity/me"),
};
