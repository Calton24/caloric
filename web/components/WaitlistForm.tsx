"use client";

import { useState, type FormEvent } from "react";
import {
  FITNESS_GOALS,
  type FitnessGoalValue,
  isValidEmail,
} from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type FormStatus = "idle" | "loading" | "success" | "duplicate" | "error";

type FormErrors = {
  name?: string;
  email?: string;
  fitnessGoal?: string;
  form?: string;
};

const INITIAL = {
  name: "",
  email: "",
  fitnessGoal: "" as FitnessGoalValue | "",
};

export function WaitlistForm() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  function validate(): FormErrors {
    const next: FormErrors = {};
    const name = values.name.trim();
    const email = values.email.trim();

    if (!name) {
      next.name = "Please enter your name.";
    } else if (name.length < 2) {
      next.name = "Name must be at least 2 characters.";
    } else if (name.length > 120) {
      next.name = "Name must be under 120 characters.";
    }

    if (!email) {
      next.email = "Please enter your email.";
    } else if (!isValidEmail(email)) {
      next.email = "Please enter a valid email address.";
    }

    if (!values.fitnessGoal) {
      next.fitnessGoal = "Please select a fitness goal.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("idle");
      return;
    }

    if (!values.fitnessGoal) {
      setErrors({ fitnessGoal: "Please select a fitness goal." });
      return;
    }

    const fitnessGoal = values.fitnessGoal;
    setStatus("loading");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("android_waitlist").insert({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        fitness_goal: fitnessGoal,
      });

      if (error) {
        // Postgres unique_violation
        if (
          error.code === "23505" ||
          /duplicate|unique/i.test(error.message)
        ) {
          setStatus("duplicate");
          setErrors({});
          return;
        }

        setStatus("error");
        setErrors({
          form: "Something went wrong. Please try again in a moment.",
        });
        return;
      }

      setStatus("success");
      setErrors({});
      setValues(INITIAL);
    } catch (error) {
      setStatus("error");
      const missingConfig =
        error instanceof Error &&
        error.message.includes("Missing NEXT_PUBLIC_SUPABASE");

      setErrors({
        form: missingConfig
          ? "Waitlist isn’t connected yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to web/.env.local (or Vercel), then restart the dev server."
          : "Unable to reach the waitlist service. Check your connection and try again.",
      });
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="glass-card rounded-3xl p-8 text-center sm:p-10"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/20 text-brand-light ring-1 ring-brand/30">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">
          You&apos;re on the Android waitlist.
        </h3>
        <p className="mt-2 text-sm text-white/55">
          We&apos;ll email you as soon as CalCut launches on Android.
        </p>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div
        role="status"
        className="glass-card rounded-3xl p-8 text-center sm:p-10"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/20 text-brand-light ring-1 ring-brand/30">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">
          You&apos;re already on the waitlist.
        </h3>
        <p className="mt-2 text-sm text-white/55">
          That email is already signed up. We&apos;ll be in touch when Android
          is ready.
        </p>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="glass-card space-y-5 rounded-3xl p-6 sm:p-8"
      aria-busy={isLoading}
    >
      <div>
        <label htmlFor="waitlist-name" className="mb-2 block text-sm font-medium text-white/80">
          Name
        </label>
        <input
          id="waitlist-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          disabled={isLoading}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "waitlist-name-error" : undefined}
          className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-[16px] text-white placeholder:text-white/30 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          placeholder="Alex"
        />
        {errors.name ? (
          <p id="waitlist-name-error" className="mt-1.5 text-sm text-red-400" role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="waitlist-email" className="mb-2 block text-sm font-medium text-white/80">
          Email
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={isLoading}
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "waitlist-email-error" : undefined}
          className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-[16px] text-white placeholder:text-white/30 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          placeholder="you@email.com"
        />
        {errors.email ? (
          <p id="waitlist-email-error" className="mt-1.5 text-sm text-red-400" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="waitlist-goal" className="mb-2 block text-sm font-medium text-white/80">
          Fitness goal
        </label>
        <select
          id="waitlist-goal"
          name="fitnessGoal"
          required
          disabled={isLoading}
          value={values.fitnessGoal}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              fitnessGoal: e.target.value as FitnessGoalValue | "",
            }))
          }
          aria-invalid={Boolean(errors.fitnessGoal)}
          aria-describedby={
            errors.fitnessGoal ? "waitlist-goal-error" : undefined
          }
          className="min-h-12 w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 text-[16px] text-white outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
        >
          <option value="" disabled className="bg-surface text-white">
            Select your goal
          </option>
          {FITNESS_GOALS.map((goal) => (
            <option
              key={goal.value}
              value={goal.value}
              className="bg-surface text-white"
            >
              {goal.label}
            </option>
          ))}
        </select>
        {errors.fitnessGoal ? (
          <p id="waitlist-goal-error" className="mt-1.5 text-sm text-red-400" role="alert">
            {errors.fitnessGoal}
          </p>
        ) : null}
      </div>

      {errors.form ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {errors.form}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-[15px] font-semibold text-surface transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface"
              aria-hidden="true"
            />
            Joining…
          </>
        ) : (
          "Join Android Waitlist"
        )}
      </button>

      <p className="text-center text-xs text-white/35">
        No spam. Launch updates only.
      </p>
    </form>
  );
}
