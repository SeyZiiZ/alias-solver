import { Sidebar } from '@components/layout/sidebar/Sidebar';
import { BarChart } from '@pages/dashboard/widgets/charts/BarChart';
import { useAuth } from '@hooks/useAuth';
import { useTheme } from '@hooks/useTheme';
import { fetchUsers, getState } from '@store/slices/userSlice';
import { User } from '@/types';
import { formatDateTime } from '@utils/formatting/date';
import { sendNotification } from '@services/notifications/notificationService';

export function Dashboard() {
  const auth = useAuth();
  const { theme, toggle } = useTheme();

  const links = [
    { label: 'home', href: '/' },
    { label: 'settings', href: '/settings' },
    { label: 'profile', href: '/profile' },
  ];

  return `
    <div class="dashboard dashboard--${theme}">
      ${auth.user ? Sidebar({ user: auth.user, links }) : ''}
      <main>
        <p>Last login: ${formatDateTime(new Date())}</p>
        ${BarChart({ title: 'users', data: [10, 20, 30, 40] })}
      </main>
    </div>
  `;
}
