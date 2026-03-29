import { NavItem } from './items/NavItem';
import { useTheme } from '../../../hooks/useTheme';
import { User } from '../../../types';

interface SidebarProps {
  user: User;
  links: Array<{ label: string; href: string }>;
}

export function Sidebar({ user, links }: SidebarProps) {
  const { theme } = useTheme();

  const items = links.map(link =>
    NavItem({ label: link.label, href: link.href, theme })
  ).join('');

  return `
    <aside class="sidebar sidebar--${theme}">
      <div class="sidebar-user">${user.name}</div>
      <nav>${items}</nav>
    </aside>
  `;
}
