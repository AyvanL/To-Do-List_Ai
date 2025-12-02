import type { AuthMode, AuthPagePropsBase } from '../../types/auth.ts';
import { AuthHero } from './AuthHero';
import { AuthPanel } from './AuthPanel';

interface AuthLayoutProps extends AuthPagePropsBase {
  mode: AuthMode;
}

export function AuthLayout({ mode, ...panelProps }: AuthLayoutProps) {
  return (
    <div className="app auth-web">
      <div className="auth-grid">
        <AuthHero />
        <section className="auth-panel">
          <AuthPanel mode={mode} {...panelProps} />
        </section>
      </div>
    </div>
  );
}
