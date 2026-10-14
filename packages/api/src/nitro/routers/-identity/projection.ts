import { sourceProjectionMeta } from "../../procedure";
import type { SourceProjectionMetadata, SourceProcedureDescriptor } from "../../procedure";
import { authenticatedProcedure } from "../../procedure";
import type { SourceLeafPath } from "../../port-map";

type RestMetadata = NonNullable<SourceProjectionMetadata["openapi"]>;

const rest = (
  method: RestMetadata["method"],
  path: RestMetadata["path"],
  summary: string,
  description: string,
  tags: string[],
  deprecated?: boolean,
): RestMetadata => ({
  method,
  path,
  tags,
  protect: true,
  summary,
  description,
  ...(deprecated === undefined ? {} : { deprecated }),
});

export const identityProjectionMetadata: Partial<Record<SourceLeafPath, SourceProjectionMetadata>> = {
  "user.create": {
    openapi: rest(
      "POST",
      "/api/users",
      "Create a user",
      "Create a credentials account and assign the supplied groups. Requires admin permission and credentials authentication to be enabled. The username must be unique and password confirmation must match.",
      ["users"],
    ),
    mcp: {
      enabled: true,
      description:
        "Create a new user account (admin only). REQUIRED: username (string), password (string), confirmPassword (must match password). OPTIONAL: email (string or null)",
    },
  },
  "user.setProfileImage": {
    openapi: rest(
      "PUT",
      "/api/users/profileImage",
      "Set a profile image",
      "Set a user's image to a base64 PNG, JPEG, GIF, or WebP data URL, or null to clear it. The data URL is limited to 350,000 characters. Users can update themselves; updating another user requires admin permission.",
      ["users"],
    ),
  },
  "user.getAll": {
    openapi: rest(
      "GET",
      "/api/users",
      "List all users",
      "Return user IDs, names, email addresses, verification dates, and profile images. Requires admin permission.",
      ["users"],
    ),
    mcp: { enabled: true, description: "List all users (admin only)" },
  },
  "user.selectable": {
    openapi: rest(
      "GET",
      "/api/users/selectable",
      "List selectable users",
      "Return user IDs, names, profile images, and email addresses for selection controls, optionally filtered by authentication provider. Requires authentication.",
      ["users"],
    ),
  },
  "user.search": {
    openapi: rest(
      "POST",
      "/api/users/search",
      "Search users",
      "Find users whose names contain the query. Returns IDs, names, profile images, and email addresses, with up to 100 results. Requires admin permission.",
      ["users"],
    ),
  },
  "user.getPreferences": {
    openapi: rest(
      "GET",
      "/api/users/preferences",
      "Get user preferences",
      "Read every preference as structured JSON. Omit userId for the current user; reading another user requires admin permission.",
      ["users"],
    ),
    mcp: {
      enabled: true,
      description:
        "Read all preferences, including color scheme, home boards, search behavior and structured header layout. Optional userId defaults to the current user; another user requires admin permission. Use user_updatePreferences to patch supplied fields.",
    },
  },
  "user.getById": {
    openapi: rest(
      "GET",
      "/api/users/{userId}",
      "Get a user",
      "Return a user's profile, authentication provider, and preferences. Users can read themselves; reading another user requires admin permission.",
      ["users"],
    ),
    mcp: { enabled: true, description: "Get user details by user ID. REQUIRED: userId (string)" },
  },
  "user.editProfile": {
    openapi: rest(
      "PUT",
      "/api/users/profile",
      "Update a user profile",
      "Update a credentials account's username and email. Users can update themselves; updating another user requires admin permission. External-provider profiles cannot be edited, and username changes are disabled in demo mode.",
      ["users"],
    ),
  },
  "user.delete": {
    openapi: rest(
      "DELETE",
      "/api/users/{userId}",
      "Delete a user",
      "Delete a user account. Users can delete themselves; deleting another user requires admin permission. Disabled in demo mode.",
      ["users"],
    ),
    mcp: { enabled: true, description: "Delete a user by ID. REQUIRED: userId (string)" },
  },
  "user.changePassword": {
    openapi: rest(
      "PATCH",
      "/api/users/{userId}/changePassword",
      "Change a user password",
      "Change a credentials account's password. Changing your own password requires the previous password, including for admins. Admins can reset another user's password without verifying their previous password. Disabled in demo mode.",
      ["users"],
    ),
  },
  "user.updatePreferences": {
    openapi: rest(
      "PATCH",
      "/api/users/preferences",
      "Update user preferences",
      "Update only supplied preferences and return the result. Omitted fields remain unchanged; null clears nullable references. Header fields and zones merge, while each supplied zone array replaces that zone. The complete merged header must retain unique items and account access. New board shortcuts must be accessible to the target user. Omit userId for yourself; another user requires admin permission. All validation completes before one write.",
      ["users"],
    ),
    mcp: {
      enabled: true,
      description:
        "Patch one or more user preferences and return the complete result. Read current values with user_getPreferences. All preference fields are optional; supply at least one. Omitted fields remain unchanged; null clears home-board/search-engine references. Header fields and zones merge; supplied zone arrays replace their zone and must preserve unique items and account access. Optional userId defaults to yourself; changing another user requires admin permission.",
    },
  },
  "user.changeHomeBoards": {
    openapi: rest(
      "PATCH",
      "/api/users/changeHome",
      "Change user home boards",
      "Set or clear a user's desktop and mobile home boards. The caller must be able to view each selected board. Users can update themselves; updating another user requires admin permission.",
      ["users"],
    ),
  },
  "user.changeDefaultSearchEngine": {
    openapi: rest(
      "PATCH",
      "/api/users/changeSearchEngine",
      "Change the default search engine",
      "Deprecated: use PATCH /api/users/search-preferences instead. Updates the default search engine and supplied DuckDuckGo bang preference while preserving the new-tab preference. Users can update themselves; updating another user requires admin permission.",
      ["users"],
      true,
    ),
  },
  "user.changeSearchPreferences": {
    openapi: rest(
      "PATCH",
      "/api/users/search-preferences",
      "Update search preferences",
      "Set a user's default search engine, new-tab behavior, and DuckDuckGo bang preference. Users can update themselves; updating another user requires admin permission.",
      ["users"],
    ),
  },
  "user.changeColorScheme": {
    openapi: rest(
      "PATCH",
      "/api/users/changeScheme",
      "Change your color scheme",
      "Set the current user's preferred color scheme. Requires authentication.",
      ["users"],
    ),
  },
  "user.changeEnableRightClickOnWidgets": {
    openapi: rest(
      "PATCH",
      "/api/users/right-click-widgets",
      "Change widget context menu behavior",
      "Enable or disable opening widget context menus with a right click for a user. Users can update themselves; updating another user requires admin permission.",
      ["users"],
    ),
  },
  "user.changeHeaderPreferences": {
    openapi: rest(
      "PATCH",
      "/api/users/header-preferences",
      "Update header preferences",
      "Replace a user's header layout and display preferences. New board shortcuts must reference boards the target user can view; existing shortcuts may be retained. Users can update themselves; updating another user requires admin permission.",
      ["users"],
    ),
  },
  "user.changeDdgBangs": {
    openapi: rest(
      "PATCH",
      "/api/users/ddg-bangs",
      "Change DuckDuckGo bang behavior",
      "Deprecated: use PATCH /api/users/search-preferences instead. Enable or disable DuckDuckGo bangs for a user. Users can update themselves; updating another user requires admin permission.",
      ["users"],
      true,
    ),
  },
  "user.changeFirstDayOfWeek": {
    openapi: rest(
      "PATCH",
      "/api/users/firstDayOfWeek",
      "Change the first day of the week",
      "Set a user's preferred first day of the week. Users can update themselves; updating another user requires admin permission.",
      ["users"],
    ),
  },
  "invite.getAll": {
    openapi: rest(
      "GET",
      "/api/invites",
      "List user invitations",
      "Return invitations with their expiration dates and creators, ordered by expiration. Invite tokens are excluded. Requires admin permission and credentials authentication to be enabled.",
      ["invites"],
    ),
    mcp: { enabled: true, description: "List all user invites" },
  },
  "invite.createInvite": {
    openapi: rest(
      "POST",
      "/api/invites",
      "Create a user invitation",
      "Create a single-use invitation with the supplied expiration date and return its ID and registration token. Requires admin permission and credentials authentication to be enabled.",
      ["invites"],
    ),
    mcp: {
      enabled: true,
      description:
        "Create a new user invite link. REQUIRED: expirationDate (ISO date string for when the invite expires). Returns the invite ID and token",
    },
  },
  "invite.deleteInvite": {
    openapi: rest(
      "DELETE",
      "/api/invites/{id}",
      "Delete a user invitation",
      "Revoke an invitation by ID. Requires admin permission and credentials authentication to be enabled. Returns not found if the invitation does not exist.",
      ["invites"],
    ),
    mcp: { enabled: true, description: "Delete an invite by ID. REQUIRED: id (invite ID string)" },
  },
  "apiKeys.getAll": { mcp: { enabled: true, description: "List all API keys (admin only)" } },
  "apiKeys.create": { mcp: { enabled: false, description: "Create a new API key for the current user (admin only)" } },
  "apiKeys.delete": {
    mcp: { enabled: true, description: "Delete an API key by ID (admin only). REQUIRED: apiKeyId (string)" },
  },
};

export function identityProcedure(
  descriptor: SourceProcedureDescriptor & {
    readonly access: Extract<SourceProcedureDescriptor["access"], { kind: "protected" | "permission" }>;
  },
) {
  const builder = authenticatedProcedure(descriptor);
  const metadata = identityProjectionMetadata[descriptor.path];
  return metadata ? builder.meta(sourceProjectionMeta(metadata)) : builder;
}
