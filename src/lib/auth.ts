/**
 * Local auth layer — stores users in localStorage so the frontend
 * works without a dedicated auth backend. Swap the `authService.*`
 * functions below for real API calls when you add a /auth/* backend.
 */
import type { User } from "@/types";

const USERS_KEY = "labbrain_users";

interface StoredUser extends User {
  passwordHash: string;
}

function getUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Very simple hash — good enough for a local mock; replace in production.
async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const authService = {
  async register(name: string, email: string, password: string): Promise<User> {
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with that email already exists.");
    }
    const passwordHash = await hashPassword(password);
    const user: StoredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, user]);
    const { passwordHash: _, ...safe } = user;
    void _;
    return safe;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const users = getUsers();
    const stored = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!stored) throw new Error("No account found with that email.");
    const hash = await hashPassword(password);
    if (hash !== stored.passwordHash) throw new Error("Incorrect password.");
    const { passwordHash: _, ...user } = stored;
    void _;
    // Mint a simple opaque session token
    const token = btoa(`${user.id}:${Date.now()}`);
    return { user, token };
  },
};
