import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import * as api from '@/services/api';
import type { Team } from '@/types';
import PageHeader from '@/components/PageHeader';
import TeamCard from '@/components/TeamCard';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  

  const load = () => {
    setLoading(true);
    api.getTeams().then(setTeams).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <>
    <div>
            <h2 className="text-3xl font-bold">
              Teams
            </h2>

            <p className="mt-2 text-gray-600">
              Manage your teams here.
            </p>
          </div>
    </>
  );
}
