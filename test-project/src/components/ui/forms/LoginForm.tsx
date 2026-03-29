import { required, isEmail, minLength } from '@ui/forms/validation/rules';
import { Button } from '@ui/buttons/Button';
import { useAuth } from '@hooks/useAuth';
import { capitalize } from '@utils/formatting/string';
import { User } from '@/types';

export function LoginForm() {
  const auth = useAuth();

  function validate(email: string, password: string): string[] {
    const errors: string[] = [];
    const emailErr = required(email) || isEmail(email);
    const passErr = required(password) || minLength(6)(password);
    if (emailErr) errors.push(emailErr);
    if (passErr) errors.push(passErr);
    return errors;
  }

  return `
    <form>
      <input name="email" />
      <input name="password" type="password" />
      ${Button({ label: capitalize('submit'), variant: 'primary' })}
    </form>
  `;
}
