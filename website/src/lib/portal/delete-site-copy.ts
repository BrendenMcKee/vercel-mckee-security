/**
 * Staff delete confirm copy. Always names this site. When the account has
 * more than one site, the extra sentence is the one that stops a county
 * login from being treated like a single house.
 */

export function siblingSiteCountFor(
  accountId: string | null,
  profileId: string,
  rows: Array<{ id: string; account_id: string | null }>,
): number {
  if (!accountId) return 0;
  return rows.filter((row) => row.account_id === accountId && row.id !== profileId).length;
}

export function deleteSiteConfirmCopy(input: {
  siteName: string;
  siblingSiteCount: number;
}): {
  title: string;
  body: string;
  confirmLead: string;
  confirmButton: string;
  keepButton: string;
  prompt: string;
  success: string;
} {
  const { siteName, siblingSiteCount } = input;
  const multiSite = siblingSiteCount > 0;
  const other =
    siblingSiteCount === 1 ? "The other site" : `The other ${siblingSiteCount} sites`;
  const verb = siblingSiteCount === 1 ? "stays" : "stay";

  const body = multiSite
    ? `Permanently erases this site only: its caller list, devices, station cache, services, payment history, and invitations. Automatic card payments on this site are stopped first. ${other} on this account ${verb}, and the login stays if they still have access to another site. This cannot be undone. Disable this site instead if you only need to lock it for a while.`
    : `Permanently erases this site: its profile, services, alarm contact list, devices, payment history, and invitations. Automatic card payments are stopped first. Their sign-in is removed only if this is their last access. This cannot be undone. Disable this site instead if you only need to lock them out for a while.`;

  const prompt = multiSite
    ? `Permanently delete this site (${siteName})?\n\nThis erases this site only. ${other} on this account ${verb}, and the login stays if they still have access.\n\nThis cannot be undone.\n\nTo confirm, type the site name exactly:`
    : `Permanently delete this site (${siteName})?\n\nThis erases this site, and their sign-in if this is their last access. Automatic card payments on this site are stopped first. This cannot be undone.\n\nTo confirm, type the site name exactly:`;

  return {
    title: "Delete this site",
    body,
    confirmLead: "To confirm, type the site name exactly:",
    confirmButton: "Permanently delete this site",
    keepButton: "Keep this site",
    prompt,
    success: multiSite
      ? `${siteName} was deleted. Other sites on this account were not changed.`
      : `${siteName} was deleted.`,
  };
}
