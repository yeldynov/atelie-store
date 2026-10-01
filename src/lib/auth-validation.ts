// Field rules shared by the auth and account forms (instant feedback) and
// their server actions (the real check). Keep both sides on these functions.

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8; // matches emailAndPassword.minPasswordLength
export const PASSWORD_MAX = 128; // Better Auth's default maximum

export type AuthField = "name" | "email" | "password";
export type FieldErrors = Partial<Record<AuthField, string>>;
export type AuthMode = "sign-in" | "sign-up";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateField(
  mode: AuthMode,
  field: AuthField,
  value: string,
): string | undefined {
  switch (field) {
    case "name": {
      const name = value.trim();
      if (!name) return "Enter your name.";
      if (name.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`;
      return undefined;
    }
    case "email": {
      const email = value.trim();
      if (!email) return "Enter your email address.";
      if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
        return "Enter a valid email address, like name@example.com.";
      }
      return undefined;
    }
    case "password": {
      if (!value) return "Enter your password.";
      // Sign-in only checks presence, so a future rule change never locks
      // out existing accounts.
      if (mode === "sign-in") return undefined;
      if (value.length < PASSWORD_MIN) {
        return `Use at least ${PASSWORD_MIN} characters.`;
      }
      if (value.length > PASSWORD_MAX) {
        return `Use at most ${PASSWORD_MAX} characters.`;
      }
      return undefined;
    }
  }
}

export function fieldsFor(mode: AuthMode): AuthField[] {
  return mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];
}

export function validateForm(
  mode: AuthMode,
  values: Partial<Record<AuthField, string>>,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldsFor(mode)) {
    const error = validateField(mode, field, values[field] ?? "");
    if (error) errors[field] = error;
  }
  return errors;
}
