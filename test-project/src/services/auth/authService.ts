import { User, ApiResponse } from '@/types';
import { API_BASE_URL } from '@utils/constants';

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const json: ApiResponse<User> = await res.json();
  return json.data;
}

export function logout(): void {
  localStorage.removeItem('token');
}
