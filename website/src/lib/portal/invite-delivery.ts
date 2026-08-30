/** Added sites on a multi-site account do not get their own house invite. */
export const MULTI_SITE_NO_SITE_INVITE_MESSAGE =
  "This site does not get its own invitation. The account already has more than one site.";

export function canMintSiteInvitation(input: {
  status: string;
  hasOpenInvite: boolean;
  accountSiteCount: number;
}): boolean {
  if (input.status !== "pending") return false;
  if (input.hasOpenInvite) return true;
  return input.accountSiteCount <= 1;
}

export type InviteDeliveryState = {
  emailAttempted: boolean;
  emailSent: boolean;
  emailPaused: boolean;
  emailHeldAutoOnboard: boolean;
};

/**
 * Staff-facing copy after create or resend. Mail pause wins over
 * auto_onboard so go-live stays the first thing they see.
 */
export function inviteDeliveryNotice(
  state: InviteDeliveryState,
  kind: "created" | "resent",
  warning = "",
): { kind: "ok" | "error"; text: string; showLink: boolean } {
  const seed = warning ? ` ${warning}` : "";
  const created = kind === "created";

  if (!state.emailAttempted) {
    return {
      kind: "ok",
      showLink: true,
      text: created
        ? `Client created. There is no email on file, so copy the activation link and deliver it yourself:${seed}`
        : "New invitation created. There is no email on file, so copy the activation link:",
    };
  }
  if (state.emailPaused) {
    return {
      kind: "ok",
      showLink: true,
      text: created
        ? `Client created. Invitation email is held until go-live (Billing tab). Copy the link if you need it now:${seed}`
        : "Invitation refreshed. Email is held until go-live (Billing tab). Copy the link if you need it now:",
    };
  }
  if (state.emailHeldAutoOnboard) {
    return {
      kind: "ok",
      showLink: true,
      text: created
        ? `Client created. Automatic invites are off on this account. Copy the link if you need it now:${seed}`
        : "Invitation refreshed. Automatic invites are off on this account. Copy the link if you need it now:",
    };
  }
  if (!state.emailSent) {
    return {
      kind: "error",
      showLink: true,
      text: created
        ? `Client created, but the invitation email failed to send. Copy the link and deliver it yourself:${seed}`
        : "Invitation refreshed, but the email failed to send. Copy the link:",
    };
  }
  return {
    kind: warning ? "error" : "ok",
    showLink: false,
    text: created
      ? `Client created and invitation email sent.${seed}`
      : "Invitation refreshed and email re-sent.",
  };
}
