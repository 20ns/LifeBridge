import { API_BASE_URL } from '../config';
import { User, RegisterData } from '../types/auth';

export interface LoginResponse {
  token: string;
  user: User;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error('Invalid credentials');
  }

  return res.json();
}

export async function registerRequest(data: RegisterData & { password: string }): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (res.status === 201) {
    const payload = await res.json();
    return { success: true, token: payload.token, user: payload.user };
  }

  const payload = await res.json().catch(() => ({ error: 'Registration failed' }));
  return { success: false, error: payload.error || 'Registration failed' };
} 