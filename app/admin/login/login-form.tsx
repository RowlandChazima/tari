'use client';

import { useActionState } from 'react';
import { loginAction, type LoginFormState } from './actions';

export function LoginForm({ safeNext }: { safeNext: string }) {
  const [state, formAction, isPending] = useActionState<LoginFormState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={safeNext} />

      {state?.error && (
        <div
          role="alert"
          className="p-3 text-sm rounded-md bg-red-50 border border-red-200 text-red-800"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50"
          placeholder="owner@taricurtains.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={isPending}
          className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-colors disabled:opacity-50"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] mt-2 px-4 py-2.5 rounded-lg bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 active:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 transition-colors disabled:opacity-60 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
      >
        {isPending ? 'Signing in...' : 'Sign in to Tari'}
      </button>
    </form>
  );
}

