import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Team } from '@/types';

interface Props {
  team: Team;
}

export default function TeamCard({ team }: Props) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{team.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
            {team.description}
          </p>
        </div>
        <div className="flex items-center gap-1 text-gray-400 shrink-0">
          <Users size={16} />
          <span className="text-sm">{team.memberIds.length}</span>
        </div>
      </div>
    </Link>
  );
}
