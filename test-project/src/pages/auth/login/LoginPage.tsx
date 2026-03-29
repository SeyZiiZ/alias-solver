import { LoginForm } from '../../../components/ui/forms/LoginForm';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { capitalize } from '../../../utils/formatting/string';
import { sendNotification } from '../../../services/notifications/notificationService';
import { User } from '../../../types';

export function LoginPage() {
  const auth = useAuth();
  const { theme } = useTheme();

  async function handleLogin(user: User) {
    await sendNotification(user, 'Welcome back!');
  }

  return `
    <div class="login-page login-page--${theme}">
      <h1>${capitalize('welcome back')}</h1>
      ${LoginForm()}
    </div>
  `;
}

// Dynamic import for code splitting
const dashboardModule = import('../../dashboard/Dashboard');

// Re-export
export { LoginForm } from '../../../components/ui/forms/LoginForm';
