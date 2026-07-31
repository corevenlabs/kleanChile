/**
 * Expected failures are values, not exceptions.
 *
 * A wrong password and a locked account are ordinary outcomes of signing in,
 * not bugs, and a caller should have to acknowledge them. `throw` is reserved
 * for the cases where the program is genuinely broken.
 */

export const ok = (value) => ({ ok: true, value });
export const err = (error) => ({ ok: false, error });
