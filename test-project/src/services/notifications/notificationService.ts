import { User } from '@/types';
import { API_BASE_URL } from '@utils/constants';

export async function sendNotification(user: User, message: string) {
  return fetch(`${API_BASE_URL}/notifications`, {
    method: 'POST',
    body: JSON.stringify({ userId: user.id, message }),
  });
}
