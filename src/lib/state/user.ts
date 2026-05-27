const key = "ootd.anonymousUserId";

export function getAnonymousUserId(): string {
  const demoUserId = "demo-user";

  if (typeof window === "undefined") {
    return demoUserId;
  }

  window.localStorage.setItem(key, demoUserId);
  return demoUserId;
}
