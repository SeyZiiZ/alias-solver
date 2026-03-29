import { capitalize } from '../../../utils/formatting/string';

interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ label, variant = 'primary', onClick }: ButtonProps) {
  return `<button class="${variant}" onclick="${onClick}">${capitalize(label)}</button>`;
}
