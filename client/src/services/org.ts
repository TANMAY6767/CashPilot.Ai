import type {
    Organization,
    User,
} from '@/types';

export interface AuthResult {
    message: string;
    organizations: Organization[];
    
}

export const getAllOrgs = async (): Promise<AuthResult> => {
    const res = await fetch('http://localhost:8000/organizations/', {
        method: 'GET',
        credentials: 'include',
    });

    if (!res.ok) {
        throw new Error('Not authenticated');
    }

    const data = await res.json();
    return data;
}

export const createOrg =async(
  name: string,
): Promise<AuthResult> => {
  const res = await fetch('http://localhost:8000/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      name,
    }),
  });

  if (!res.ok) {
    const error = await res.json();

    throw new Error(error.message || 'organization creation failed');
  }

  return res.json();
}