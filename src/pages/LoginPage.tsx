import type { AuthPagePropsBase } from '../types/auth.ts';
import { AuthLayout } from '../components/auth/AuthLayout';

interface LoginPageProps extends AuthPagePropsBase {}

export function LoginPage(props: LoginPageProps) {
  return <AuthLayout mode="sign-in" {...props} />;
}
