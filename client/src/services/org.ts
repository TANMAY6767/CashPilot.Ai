// import type { Organization } from '@/types';
// import { authenticatedFetch } from '@/services/api';

// export interface AuthResult {
//     message: string;
//     organizations: Organization[];
// }

// export const getAllOrgs = async (): Promise<AuthResult> => {
//     const res = await authenticatedFetch('http://localhost:8000/org/');

//     if (!res.ok) {
//         const error = await res.json().catch(() => null);
//         throw new Error(error?.message || 'Could not load organizations.');
//     }

//     const response = await res.json();
//     return { message: response.message, organizations: response.data };
// }

// export const createOrg = async (
//   name: string,
// ): Promise<Organization> => {
//   const res = await authenticatedFetch('http://localhost:8000/org/', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     credentials: 'include',
//     body: JSON.stringify({
//       name,
//     }),
//   });

//   if (!res.ok) {
//     const error = await res.json().catch(() => null);
//     throw new Error(error?.message || 'Organization creation failed.');
//   }

//   const response = await res.json();
//   return response.data;
// }
