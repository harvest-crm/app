// Pure constants + types — safe to import from client and server components.

export type Role = "owner" | "admin" | "member";

export const ROLE_RANK: Record<Role, number> = {
  owner:  3,
  admin:  2,
  member: 1,
};

export const ROLE_LABELS: Record<Role, string> = {
  owner:  "Owner",
  admin:  "Admin",
  member: "Member",
};

export const PERMISSIONS = {
  // Owner-only
  DELETE_ORG:             "owner",
  TRANSFER_OWNERSHIP:     "owner",
  MANAGE_BILLING:         "owner",

  // Admin+
  INVITE_MEMBERS:         "admin",
  REMOVE_MEMBERS:         "admin",
  CHANGE_MEMBER_ROLE:     "admin",
  MANAGE_WORKSPACES:      "admin",
  MANAGE_CUSTOM_FIELDS:   "admin",
  MANAGE_AUTOMATIONS:     "admin",
  MANAGE_TASK_TEMPLATES:  "admin",
  MANAGE_EMAIL_TEMPLATES: "admin",
  DELETE_WORKSPACE:       "admin",
  BULK_DELETE_CONTACTS:   "admin",
  DELETE_CUSTOM_FIELD:    "admin",
  EDIT_ORG_SETTINGS:      "admin",

  // Member+ (everyone)
  CREATE_CONTACT:         "member",
  EDIT_CONTACT:           "member",
  DELETE_OWN_CONTACT:     "member",
  CREATE_DEAL:            "member",
  EDIT_DEAL:              "member",
  DELETE_DEAL:            "member",
  CREATE_TASK:            "member",
  COMPLETE_TASK:          "member",
  DELETE_TASK:            "member",
  LOG_ACTIVITY:           "member",
  COMPOSE_EMAIL:          "member",
  UPLOAD_DOCUMENT:        "member",
  VIEW_ANALYTICS:         "member",
} as const satisfies Record<string, Role>;

// Map Clerk role strings → our roles (pure function, no imports)
export function clerkRoleToOurRole(clerkRole: string, isOwner = false): Role {
  if (isOwner) return "owner";
  if (clerkRole === "org:admin") return "admin";
  return "member";
}
