import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export default async function AdminWorkspacesPage() {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, name, slug, plan, owner_id, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Workspaces</h1>
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Owner ID</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(workspaces ?? []).map((w) => (
              <tr key={w.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="p-3 font-medium">{w.name}</td>
                <td className="p-3 text-gray-400">{w.slug}</td>
                <td className="p-3"><span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{w.plan}</span></td>
                <td className="p-3 text-gray-500 font-mono text-xs">{w.owner_id}</td>
                <td className="p-3 text-gray-500">{new Date(w.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}