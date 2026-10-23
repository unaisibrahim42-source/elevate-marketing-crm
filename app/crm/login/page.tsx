import Image from "next/image";
import { loginAction } from "@/lib/actions/auth-actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "That email or password isn't right.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="crm-root min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-white.png"
            alt="Elevate Marketing"
            width={160}
            height={100}
            className="h-20 w-auto"
            priority
          />
        </div>

        <div className="crm-panel-raised p-7 crm-glow-lime">
          <p className="crm-label mb-1">Elevate Marketing</p>
          <h1 className="crm-heading text-xl mb-6" style={{ color: "var(--crm-cyan)" }}>
            Internal Access
          </h1>

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next ?? "/crm/overview"} />

            <div>
              <label htmlFor="email" className="crm-label block mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                className="crm-input"
                placeholder="you@elevatecreativemedia.co.uk"
              />
            </div>

            <div>
              <label htmlFor="password" className="crm-label block mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="crm-input"
                placeholder="••••••••••"
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--crm-red)" }}>
                {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
              </p>
            )}

            <button type="submit" className="crm-btn crm-btn-primary w-full py-2.5 mt-2">
              Enter
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "var(--crm-text-faint)" }}>
          Private system. Authorised Elevate team members only.
        </p>
      </div>
    </div>
  );
}
