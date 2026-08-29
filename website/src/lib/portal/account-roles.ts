/** Client-facing role words. Schema stays `owner` / `member`. */

export const LAST_OWNER_REVOKE_MESSAGE =
  "Cannot revoke the last Account admin. Transfer account admin to a Member first.";

export function clientRoleLabel(role: string): string {
  return role === "owner" ? "Account admin" : "Member";
}
