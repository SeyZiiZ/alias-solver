import { User } from '../../types';
import { getUsers, getUserById } from '../../lib/api/endpoints/users';

interface UserState {
  users: User[];
  current: User | null;
  loading: boolean;
}

const state: UserState = { users: [], current: null, loading: false };

export async function fetchUsers() {
  state.loading = true;
  state.users = await getUsers();
  state.loading = false;
}

export async function fetchUser(id: string) {
  state.loading = true;
  state.current = await getUserById(id);
  state.loading = false;
}

export function getState() {
  return state;
}
