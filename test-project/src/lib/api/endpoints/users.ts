import { User, ApiResponse } from '../../../types';
import { API_BASE_URL, MAX_RETRIES } from '../../../utils/constants';
import { withRetry } from '../interceptors/retry';

export async function getUsers(): Promise<User[]> {
  return withRetry(async () => {
    const res = await fetch(`${API_BASE_URL}/users`);
    const json: ApiResponse<User[]> = await res.json();
    return json.data;
  }, MAX_RETRIES);
}

export async function getUserById(id: string): Promise<User> {
  return withRetry(async () => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`);
    const json: ApiResponse<User> = await res.json();
    return json.data;
  }, MAX_RETRIES);
}
