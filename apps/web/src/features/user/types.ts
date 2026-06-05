export type AppUser = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};
