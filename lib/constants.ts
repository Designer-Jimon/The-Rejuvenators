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
  hero_primary_label: "Join Our Church Family",
  hero_primary_href: "/register",
  hero_secondary_label: "Discover Our Vision",
  hero_secondary_href: "/vision-mission",
  logo_key: "",
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
  map_url: "",
  footer_note: "Built for the IT IS FINISHED REVIVAL OUTREACH family.",
};

export const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/vision-mission", label: "Vision & Mission" },
  { href: "/activities", label: "Activities" },
  { href: "/departments", label: "Departments" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export type ContentBlockDefault = {
  key: string;
  title: string;
  body: string;
};

export const DEFAULT_CONTENT_BLOCKS: Record<string, ContentBlockDefault> = {
  about_story: {
    key: "about_story",
    title: "Our story",
    body: "In June 2010, while praying in the Spirit, the founder heard \"IT IS FINISHED\" and thought it was a programme theme for August. In that meeting the Holy Ghost said He had inaugurated \"IT IS FINISHED\" as a commission to provoke revival in this end time. It became a monthly all-night meeting until October 2012, when, after waiting on the Lord for the blueprint, the vision and mission were given.",
  },
  scripture: {
    key: "scripture",
    title: "John 19:30",
    body: "\"When Jesus therefore had received the vinegar, He said IT IS FINISHED: and He bowed His head and gave up the ghost.\"",
  },
  intro: {
    key: "intro",
    title: "A mandate of revival",
    body: "Revival is the heartbeat of God in this time. Anytime darkness covers the earth to the point that wickedness and oppression increase (Isaiah 60:2), what we need is Revival (Isaiah 60:1). \"IT IS FINISHED\" was the last word our Lord and Saviour Jesus uttered at the cross and was the beginning of Revival for mankind. The commission is named IT IS FINISHED REVIVAL OUTREACH from that word (John 19:30).",
  },
  vision: {
    key: "vision",
    title: "Our vision",
    body: "To provoke REVIVAL. Revival means calling forth something dead, weak or no longer efficient; Christ becoming more popular than anything or anyone; the glory of the Lord becoming real in our nation (Hab 2:14); the supernatural power of God becoming part of everyday life; righteousness, holiness and purity becoming our character; commanding the world to the obedience of Christ.",
  },
  mission: {
    key: "mission",
    title: "Our mission",
    body: "1) Win souls for Christ, the primary assignment, through crusades and outreaches (Mark 16:15, Acts 1:8).\n2) Disciple men and women through the Foundation Class and Rejuvenators Gathering (Matt 28:19-20) to be fire carriers (Joel 2:3).\n3) Raise worshippers (Rev 14:6-8; 2 Chron 5:11-14): create an atmosphere of worship in every meeting; our existence is to worship God (Isa 43:21); worship deepens relationship with God (Ps 63:1-3, 42:1-2).\n4) Bring people to the place of supernatural power in their field of profession (Mark 16:20; Acts 4:31-33).\n5) Make them know Christ lives in us and we are His representatives (1 Cor 3:23).\n6) Hold revival meetings in campuses, churches, schools and Christian organisations: campus outreaches called \"Rescue Missions\", revival meetings in churches in bad spiritual state, school outreaches, crusades in cities and nations, and raising revivalists in families (Acts 21:8-9).",
  },
  closing: {
    key: "closing",
    title: "Our passion",
    body: "Revival is our mandate; to set the world on fire is our passion; that Jesus will be known all over the world is our desire.",
  },
  core_values: {
    key: "core_values",
    title: "Core values",
    body: "[Edit in Admin: Core values]",
  },
  what_we_believe: {
    key: "what_we_believe",
    title: "What we believe",
    body: "[Edit in Admin: What we believe]",
  },
  spiritual_mandate: {
    key: "spiritual_mandate",
    title: "Spiritual mandate",
    body: "[Edit in Admin: Spiritual mandate]",
  },
  pastor_intro: {
    key: "pastor_intro",
    title: "Meet our pastor",
    body: "[Edit in Admin: Pastor introduction]",
  },
  latest_devotional: {
    key: "latest_devotional",
    title: "Latest devotional",
    body: "[Edit in Admin: Latest devotional]",
  },
  appointment_cta: {
    key: "appointment_cta",
    title: "Book an appointment",
    body: "[Edit in Admin: Appointment booking details]",
  },
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
  { key: "hero_primary_label", label: "Hero primary button label" },
  { key: "hero_primary_href", label: "Hero primary button link" },
  { key: "hero_secondary_label", label: "Hero secondary button label" },
  { key: "hero_secondary_href", label: "Hero secondary button link" },
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
  { key: "map_url", label: "Map link" },
  { key: "footer_note", label: "Footer note" },
];
