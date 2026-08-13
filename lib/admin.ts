export function isValidAdminPassword(supplied: string | null): boolean {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured) return supplied === configured;
  return process.env.NODE_ENV !== "production" && supplied === "lumina-demo";
}
