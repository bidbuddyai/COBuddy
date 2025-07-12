export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function handleUnauthorizedError(error: Error) {
  if (isUnauthorizedError(error)) {
    // Redirect to login or show authentication modal
    window.location.href = "/login";
  }
}
