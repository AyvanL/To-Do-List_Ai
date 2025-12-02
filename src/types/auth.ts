import type { FormEvent } from 'react';

export type AuthMode = 'sign-in' | 'sign-up';

export interface AuthFormState {
  email: string;
  password: string;
}

export interface AuthPagePropsBase {
  authForm: AuthFormState;
  isLoading: boolean;
  authError: string;
  authMessage: string;
  onFieldChange: (field: 'email' | 'password', value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchMode: (mode: AuthMode) => void;
}
