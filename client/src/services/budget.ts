import { User } from "@/types"

export interface AuthResult {
    message: string;
    user: User;
}

export const signUp = async (
    name: string,
    email: string,
    password: string
): Promise<AuthResult> => {
    const res = await fetch("http://localhost:8000/users/signup", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            name,
            email,
            password,
        }),
    })

    if (!res.ok) {
    const error = await res.json();

    throw new Error(error.message || 'Signup failed');
  }

  return res.json();

}