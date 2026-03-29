export const required = (value: string) => value.length > 0 ? null : 'Required';
export const minLength = (min: number) => (value: string) =>
  value.length >= min ? null : `Minimum ${min} characters`;
export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email';
