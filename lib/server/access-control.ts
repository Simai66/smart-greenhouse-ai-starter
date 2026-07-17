import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";

export type GreenhouseRole = "viewer" | "operator" | "admin";

type AuthorizedUser = ChatGPTUser & { role: GreenhouseRole };

const roleRank: Record<GreenhouseRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

function configuredEmails(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function roleForEmail(email: string): GreenhouseRole {
  const normalizedEmail = email.toLowerCase();
  if (configuredEmails("GREENHOUSE_ADMIN_EMAILS").has(normalizedEmail)) return "admin";
  if (configuredEmails("GREENHOUSE_OPERATOR_EMAILS").has(normalizedEmail)) return "operator";
  return "viewer";
}

/**
 * The identity headers are injected by the hosted ChatGPT auth layer. Roles
 * deliberately come only from server configuration, never a request header.
 */
export async function authorizeApiRole(
  minimumRole: GreenhouseRole,
): Promise<{ user: AuthorizedUser } | { response: Response }> {
  const user = await getChatGPTUser();
  if (!user) {
    return {
      response: Response.json({ error: "Authentication is required." }, { status: 401 }),
    };
  }

  const role = roleForEmail(user.email);
  if (roleRank[role] < roleRank[minimumRole]) {
    return {
      response: Response.json({ error: "You do not have permission for this action." }, { status: 403 }),
    };
  }

  return { user: { ...user, role } };
}
