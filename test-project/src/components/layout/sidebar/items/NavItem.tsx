import { capitalize } from '../../../../utils/formatting/string';
import { slugify } from '../../../../utils/formatting/string';
import { Theme } from '../../../../types';

interface NavItemProps {
  label: string;
  href: string;
  theme: Theme;
}

export function NavItem({ label, href, theme }: NavItemProps) {
  const className = `nav-item nav-item--${theme}`;
  return `<a href="${href}" class="${className}">${capitalize(label)}</a>`;
}
