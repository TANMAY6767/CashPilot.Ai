import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getOrg,
  type OrganizationDetail,
} from "@/services/oraganizations/org.services";

export default function OrganizationOverview() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    if (!orgId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getOrg(orgId);
        console.log("babu is :- ",data);
        if (!data) {
          setError("Organization not found");
        } else {
          setOrg(data);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load organization"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgId]);

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading organization...</p>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/organization")}
          className="mb-4 px-4 py-2 border-2 border-black rounded-lg font-bold"
        >
          ← Back
        </button>
        <p className="text-red-500">{error || "Organization not found"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white w-full h-screen">
      {/* Header */}
      <div className="flex w-full items-center space-x-6 p-6 border-b-2 border-black">
        <button
          onClick={() => navigate("/organization")}
          className="text-black h-12 font-bold bg-white px-4 rounded-lg border-2 border-black"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{org.name}</h2>
          <p className="text-gray-500 text-sm">
            Created by {org.createdBy.name} •{" "}
            {new Date(org.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full flex-1 p-6 grid grid-cols-2 gap-6 overflow-auto">
        {/* Members */}
        <section className="border rounded-xl p-4">
          <h3 className="text-xl font-bold mb-4">
            Members ({org.members.length})
          </h3>
          <ul className="space-y-2">
            {org.members.map((m) => (
              <li
                key={m.id}
                className="flex justify-between items-center border-b pb-2 last:border-b-0"
              >
                <div>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-sm text-gray-500">{m.user.email}</p>
                </div>
                <span className="text-xs uppercase bg-gray-100 px-2 py-1 rounded">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Teams */}
        <section className="border rounded-xl p-4">
          <h3 className="text-xl font-bold mb-4">
            Teams ({org.teams.length})
          </h3>
          <ul className="space-y-2">
            {org.teams.map((t) => (
              <li
                key={t.id}
                className="flex justify-between items-center border-b pb-2 last:border-b-0"
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-gray-500">
                  {t._count.members} members • {t._count.transactions} txns
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}