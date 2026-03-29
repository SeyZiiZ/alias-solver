import { User } from '@/types';
import { formatDate } from '@utils/formatting/date';
import { capitalize } from '@utils/formatting/string';
import { getUsers } from '@lib/api/endpoints/users';

interface BarChartProps {
  title: string;
  data: number[];
}

export function BarChart({ title, data }: BarChartProps) {
  const bars = data.map((val, i) => `<div class="bar" style="height:${val}px">${val}</div>`).join('');
  return `
    <div class="bar-chart">
      <h3>${capitalize(title)}</h3>
      <div class="bars">${bars}</div>
      <span class="date">${formatDate(new Date())}</span>
    </div>
  `;
}
