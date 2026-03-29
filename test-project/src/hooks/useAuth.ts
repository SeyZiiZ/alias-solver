import { User } from '../types';
import { login, logout } from '../services/auth/authService';

export function useAuth() {
  let currentUser: User | null = null;

  return {
    login: async (email: string, password: string) => {
      currentUser = await login(email, password);
      return currentUser;
    },
    logout: () => {
      logout();
      currentUser = null;
    },
    get user() { return currentUser; },
  };
}
