function trimEnv(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

export function getVapidPublicKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
    process.env.VAPID_PUBLIC_KEY;
  return key ? trimEnv(key) : null;
}

export function getPushEnv() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY
    ? trimEnv(process.env.VAPID_PRIVATE_KEY)
    : null;
  const subject =
    process.env.VAPID_SUBJECT?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "mailto:soporte@mundial-compas.app";

  if (!publicKey || !privateKey) return null;

  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return getPushEnv() !== null;
}
