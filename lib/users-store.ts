import type { AppRole } from "@/lib/session";

export type AppUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: AppRole;
};
