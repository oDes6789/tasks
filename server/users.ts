export interface AppUser {
  id: number;
  edutalkUserId: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: number;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}

const usersByEdutalkId = new Map<number, AppUser>();
let nextId = 1;

export function upsertUserFromEdutalk(input: {
  id: number;
  name: string;
  email: string;
}): AppUser {
  const existing = usersByEdutalkId.get(input.id);
  if (existing) {
    existing.name = input.name;
    existing.email = input.email;
    return existing;
  }

  const user: AppUser = {
    id: nextId++,
    edutalkUserId: input.id,
    name: input.name,
    email: input.email,
    avatarUrl: null,
    createdAt: Date.now()
  };
  usersByEdutalkId.set(input.id, user);
  return user;
}

export function getUserById(id: number): AppUser | null {
  for (const user of usersByEdutalkId.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl
  };
}
