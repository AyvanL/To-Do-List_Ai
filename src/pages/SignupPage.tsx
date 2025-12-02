import type { AuthPagePropsBase } from '../types/auth.ts';
import { AuthLayout } from '../components/auth/AuthLayout';

interface SignupPageProps extends AuthPagePropsBase {}

export function SignupPage(props: SignupPageProps) {
  return <AuthLayout mode="sign-up" {...props} />;
}
