export const SESSION_COOKIE = "iif_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export const ROLES = {
  superAdmin: "super_admin",
  membershipAdmin: "membership_admin",
  contentAdmin: "content_admin",
  unitLeader: "unit_leader",
  member: "member",
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  adminAccess: "admin.access",
  memberReview: "member.review",
  memberManage: "member.manage",
  memberLeader: "member.leader",
  memberFollowup: "member.followup",
  memberWhatsapp: "member.whatsapp",
  contentManage: "content.manage",
  settingsManage: "settings.manage",
  directoryView: "directory.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  membership_admin: "Membership Admin",
  content_admin: "Content Admin",
  unit_leader: "Unit Leader",
  member: "Member",
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: Object.values(PERMISSIONS),
  membership_admin: [
    PERMISSIONS.adminAccess,
    PERMISSIONS.memberReview,
    PERMISSIONS.memberManage,
    PERMISSIONS.memberLeader,
    PERMISSIONS.memberFollowup,
    PERMISSIONS.memberWhatsapp,
    PERMISSIONS.directoryView,
  ],
  content_admin: [
    PERMISSIONS.adminAccess,
    PERMISSIONS.contentManage,
    PERMISSIONS.settingsManage,
    PERMISSIONS.directoryView,
  ],
  unit_leader: [PERMISSIONS.directoryView],
  member: [PERMISSIONS.directoryView],
};

export const NOTIFICATION_TYPES = {
  memberRegistration: "member_registration",
  memberApproved: "member_approved",
  memberRejected: "member_rejected",
  memberStatus: "member_status",
  leaderAssigned: "leader_assigned",
  general: "general",
} as const;

export const NOTIFICATION_LABELS: Record<string, string> = {
  member_registration: "New member registrations",
  member_approved: "Registration decisions",
  member_rejected: "Registration decisions",
  member_status: "Membership status changes",
  leader_assigned: "Unit leader assignments",
  general: "General announcements",
};

export const DEFAULT_SETTINGS: Record<string, string> = {
  church_name: "IT IS FINISHED REVIVAL OUTREACH",
  tagline: "A place of revival, restoration and purpose",
  pastor_name: "Pastor David Obidimalor",
  hero_headline: "Come as you are. Leave renewed.",
  hero_subheadline:
    "A Christ-centred family raising believers for revival, service and purpose.",
  welcome_title: "You are welcome home",
  welcome_body:
    "IT IS FINISHED REVIVAL OUTREACH is a place of worship, healing and growth. Whether you are new to faith or returning, there is a place for you here.",
  address: "[Church address - edit in Admin]",
  phone: "[Church phone - edit in Admin]",
  email: "[Church email - edit in Admin]",
  service_sunday: "[Sunday service time - edit in Admin]",
  service_weekday: "[Midweek service time - edit in Admin]",
  whatsapp_group_url: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  footer_note: "Built for the IT IS FINISHED REVIVAL OUTREACH family.",
};

export const MEMBER_REGISTRATION_MESSAGE = (departmentName: string) =>
  `A new member has registered with IT IS FINISHED REVIVAL OUTREACH and has expressed interest in serving God through the ${departmentName} Department.`;

export const SETTING_FIELDS: Array<{
  key: string;
  label: string;
  multiline?: boolean;
  type?: string;
}> = [
  { key: "church_name", label: "Church name" },
  { key: "tagline", label: "Tagline" },
  { key: "pastor_name", label: "Lead pastor" },
  { key: "hero_headline", label: "Homepage headline" },
  { key: "hero_subheadline", label: "Homepage subheading", multiline: true },
  { key: "welcome_title", label: "Welcome title" },
  { key: "welcome_body", label: "Welcome message", multiline: true },
  { key: "address", label: "Church address" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "service_sunday", label: "Sunday service" },
  { key: "service_weekday", label: "Midweek service" },
  { key: "whatsapp_group_url", label: "WhatsApp group invite link" },
  { key: "facebook_url", label: "Facebook URL" },
  { key: "instagram_url", label: "Instagram URL" },
  { key: "youtube_url", label: "YouTube URL" },
  { key: "footer_note", label: "Footer note" },
];
