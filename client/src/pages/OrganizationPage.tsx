import { useEffect, useState } from 'react';
import * as api from '@/services/org';
import { AuthResult } from '@/services/org';

export default function OrganizationPage() {
  const [orgs, setOrgs] = useState<AuthResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Get all organizations
  const loadOrganizations = async () => {
    try {
      setLoading(true);

      const data = await api.getAllOrgs();
      setOrgs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  // Create organization
  const handleCreateOrganization = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');

      await api.createOrg(orgName.trim());

      // Clear form
      setOrgName('');

      // Close form
      setShowForm(false);

      // Fetch organizations again
      await loadOrganizations();

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to create organization');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col bg-white w-full h-screen">

      {/* Header */}
      <div className="flex w-full items-center space-x-10 p-6">

        <h2 className="text-3xl font-bold">
          Organization
        </h2>

        <button
          onClick={() => {
            setShowForm(true);
            setError('');
          }}
          className="text-black h-12 font-bold bg-white px-4 rounded-lg border-2 border-black"
        >
          + New Organization
        </button>

      </div>


      {/* Content */}
      <div className="w-full bg-blue-400 flex-1 p-6">

        {/* Loading */}
        {loading && (
          <p className="text-white">
            Loading organizations...
          </p>
        )}


        {/* Organizations */}
        {!loading && (
          <div className="grid grid-cols-4">

            {orgs?.organizations.map((org) => (
              <div
                key={org.id}
                className="p-6 m-3 bg-white border rounded-xl shadow-sm"
              >
                <h2 className="text-xl font-bold">
                  {org.name}
                </h2>

                <p className="text-gray-500">
                  {org._count?.members ?? 0} members
                </p>
              </div>
            ))}

          </div>
        )}

      </div>


      {/* Create Organization Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white w-[400px] rounded-xl p-6 shadow-xl">

            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold">
                Create Organization
              </h2>

              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>

            </div>


            {/* Form */}
            <form onSubmit={handleCreateOrganization}>

              <label className="block font-medium mb-2">
                Organization Name
              </label>

              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black"
                autoFocus
              />

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm mt-2">
                  {error}
                </p>
              )}


              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setOrgName('');
                    setError('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}