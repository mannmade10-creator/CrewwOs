"use client";
// app/admin/users/page.tsx
// Admin user management — list all Clerk users with Ban (revoke sessions) and Delete buttons.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  createdAt: number;
  lastSignInAt: number | null;
  banned?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 403) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setUsers(data.users ?? []);
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  async function banUser(userId: string) {
    if (!confirm("Revoke all active sessions for this user? They will be signed out immediately.")) return;
    setActionUserId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/kick-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      alert(`Revoked ${data.revoked} session(s).`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionUserId(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Permanently delete user "${email}"? This cannot be undone.`)) return;
    setActionUserId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading users…</div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Last Sign-in</th>
                <th className="text-left p-3">Clerk ID</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const email = u.emailAddresses[0]?.emailAddress ?? "—";
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                const busy = actionUserId === u.id;
                return (
                  <tr key={u.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                    <td className="p-3 font-medium">{name}</td>
                    <td className="p-3 text-gray-300">{email}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="p-3 text-gray-600 font-mono text-xs">{u.id}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => banUser(u.id)}
                        disabled={busy}
                        className="px-3 py-1 text-xs rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-40 transition-colors"
                      >
                        {busy ? "…" : "Ban"}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, email)}
                        disabled={busy}
                        className="px-3 py-1 text-xs rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                      >
                        {busy ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-600">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}