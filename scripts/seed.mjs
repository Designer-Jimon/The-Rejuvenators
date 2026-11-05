import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import crypto from "node:crypto";

const remote = process.argv.includes("--remote");
const mode = remote ? "remote" : "local";
const encoder = new TextEncoder();

const q = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const b = (value) => (value ? 1 : 0);

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 },
    key,
    256,
  );
  return `pbkdf2_sha256$210000$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}

const adminName = process.env.SEED_ADMIN_NAME || "Super Admin";
const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || (remote ? "" : "ChangeMe123!");
const memberName = process.env.SEED_MEMBER_NAME || "Test Member";
const memberEmail = (process.env.SEED_MEMBER_EMAIL || "member@example.com").toLowerCase();
const memberPassword = process.env.SEED_MEMBER_PASSWORD || (remote ? "" : "Member123!");

if (!adminPassword) {
  console.error("SEED_ADMIN_PASSWORD is required when seeding a remote database.");
  process.exit(1);
}
if (!memberPassword) {
  console.error("SEED_MEMBER_PASSWORD is required when seeding a remote database.");
  process.exit(1);
}

const adminHash = await hashPassword(adminPassword);
const memberHash = await hashPassword(memberPassword);

const permissions = [
  ["perm_admin_access", "admin.access", "Access the admin dashboard"],
  ["perm_member_review", "member.review", "Approve or reject registrations"],
  ["perm_member_manage", "member.manage", "Assign departments and membership status"],
  ["perm_member_leader", "member.leader", "Assign and remove unit leaders"],
  ["perm_member_followup", "member.followup", "Manage follow-up status and notes"],
  ["perm_member_whatsapp", "member.whatsapp", "Send WhatsApp group invitations"],
  ["perm_content_manage", "content.manage", "Manage site content and media"],
  ["perm_settings_manage", "settings.manage", "Manage site settings"],
  ["perm_directory_view", "directory.view", "View the member directory"],
];

const roles = [
  ["role_super_admin", "super_admin", "Super Admin", "Full access to every area."],
  ["role_membership_admin", "membership_admin", "Membership Admin", "Membership review and follow-up."],
  ["role_content_admin", "content_admin", "Content Admin", "Content and site settings."],
  ["role_unit_leader", "unit_leader", "Unit Leader", "Department leadership access."],
  ["role_member", "member", "Member", "Member platform access."],
];

const rolePermissions = {
  role_super_admin: permissions.map((item) => item[0]),
  role_membership_admin: [
    "perm_admin_access",
    "perm_member_review",
    "perm_member_manage",
    "perm_member_leader",
    "perm_member_followup",
    "perm_member_whatsapp",
    "perm_directory_view",
  ],
  role_content_admin: [
    "perm_admin_access",
    "perm_content_manage",
    "perm_settings_manage",
    "perm_directory_view",
  ],
  role_unit_leader: ["perm_directory_view"],
  role_member: ["perm_directory_view"],
};

const departments = [
  ["dept_worship", "Worship Team", "worship-team", "Praise, worship and music ministry.", 1],
  ["dept_media", "Media Unit", "media-unit", "Photography, video and livestream.", 2],
  ["dept_ushering", "Ushering Unit", "ushering-unit", "Welcome, seating and order.", 3],
  ["dept_technical", "Technical Unit", "technical-unit", "Sound, lighting and technical support.", 4],
  ["dept_content", "Content Unit", "content-unit", "Writing, design and social media.", 5],
  ["dept_cleaning", "Cleaning Unit", "cleaning-unit", "Keeping the house of God clean and ready.", 6],
];

const settings = {
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

const lines = [
  "PRAGMA foreign_keys = ON;",
  "BEGIN TRANSACTION;",
];

for (const [id, key, description] of permissions) {
  lines.push(
    `INSERT OR IGNORE INTO permissions (id, key, description, created_at) VALUES (${q(id)}, ${q(key)}, ${q(description)}, unixepoch() * 1000);`,
  );
}

for (const [id, key, label, description] of roles) {
  lines.push(
    `INSERT OR IGNORE INTO roles (id, key, label, description, created_at) VALUES (${q(id)}, ${q(key)}, ${q(label)}, ${q(description)}, unixepoch() * 1000);`,
  );
}

for (const [roleId, permissionIds] of Object.entries(rolePermissions)) {
  for (const permissionId of permissionIds) {
    lines.push(
      `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (${q(roleId)}, ${q(permissionId)});`,
    );
  }
}

for (const [id, name, slug, description, sortOrder] of departments) {
  lines.push(
    `INSERT OR IGNORE INTO departments (id, name, slug, description, sort_order, is_active, created_at, updated_at) VALUES (${q(id)}, ${q(name)}, ${q(slug)}, ${q(description)}, ${sortOrder}, 1, unixepoch() * 1000, unixepoch() * 1000);`,
  );
}

for (const [key, value] of Object.entries(settings)) {
  lines.push(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (${q(key)}, ${q(value)}, unixepoch() * 1000) ON CONFLICT(key) DO NOTHING;`,
  );
}

const contentBlocks = [
  [
    "block_about",
    "about_story",
    "Our story",
    "In June 2010, while praying in the Spirit, the founder heard \"IT IS FINISHED\" and thought it was a programme theme for August. In that meeting the Holy Ghost said He had inaugurated \"IT IS FINISHED\" as a commission to provoke revival in this end time. It became a monthly all-night meeting until October 2012, when, after waiting on the Lord for the blueprint, the vision and mission were given.",
  ],
  [
    "block_scripture",
    "scripture",
    "John 19:30",
    "\"When Jesus therefore had received the vinegar, He said IT IS FINISHED: and He bowed His head and gave up the ghost.\"",
  ],
  [
    "block_intro",
    "intro",
    "A mandate of revival",
    "Revival is the heartbeat of God in this time. Anytime darkness covers the earth to the point that wickedness and oppression increase (Isaiah 60:2), what we need is Revival (Isaiah 60:1). \"IT IS FINISHED\" was the last word our Lord and Saviour Jesus uttered at the cross and was the beginning of Revival for mankind. The commission is named IT IS FINISHED REVIVAL OUTREACH from that word (John 19:30).",
  ],
  [
    "block_vision",
    "vision",
    "Our vision",
    "To provoke REVIVAL. Revival means calling forth something dead, weak or no longer efficient; Christ becoming more popular than anything or anyone; the glory of the Lord becoming real in our nation (Hab 2:14); the supernatural power of God becoming part of everyday life; righteousness, holiness and purity becoming our character; commanding the world to the obedience of Christ.",
  ],
  [
    "block_mission",
    "mission",
    "Our mission",
    "1) Win souls for Christ, the primary assignment, through crusades and outreaches (Mark 16:15, Acts 1:8).\n2) Disciple men and women through the Foundation Class and Rejuvenators Gathering (Matt 28:19-20) to be fire carriers (Joel 2:3).\n3) Raise worshippers (Rev 14:6-8; 2 Chron 5:11-14): create an atmosphere of worship in every meeting; our existence is to worship God (Isa 43:21); worship deepens relationship with God (Ps 63:1-3, 42:1-2).\n4) Bring people to the place of supernatural power in their field of profession (Mark 16:20; Acts 4:31-33).\n5) Make them know Christ lives in us and we are His representatives (1 Cor 3:23).\n6) Hold revival meetings in campuses, churches, schools and Christian organisations: campus outreaches called \"Rescue Missions\", revival meetings in churches in bad spiritual state, school outreaches, crusades in cities and nations, and raising revivalists in families (Acts 21:8-9).",
  ],
  [
    "block_closing",
    "closing",
    "Our passion",
    "Revival is our mandate; to set the world on fire is our passion; that Jesus will be known all over the world is our desire.",
  ],
  [
    "block_core_values",
    "core_values",
    "Core values",
    "[Edit in Admin: Core values]",
  ],
  [
    "block_what_we_believe",
    "what_we_believe",
    "What we believe",
    "[Edit in Admin: What we believe]",
  ],
  [
    "block_spiritual_mandate",
    "spiritual_mandate",
    "Spiritual mandate",
    "[Edit in Admin: Spiritual mandate]",
  ],
  [
    "block_pastor_intro",
    "pastor_intro",
    "Meet our pastor",
    "[Edit in Admin: Pastor introduction]",
  ],
  [
    "block_latest_devotional",
    "latest_devotional",
    "Latest devotional",
    "[Edit in Admin: Latest devotional]",
  ],
  [
    "block_appointment_cta",
    "appointment_cta",
    "Book an appointment",
    "[Edit in Admin: Appointment booking details]",
  ],
];

const activities = [
  [
    "act_sunday_service",
    "Sunday Service",
    "Day: Sunday\nTime: [Sunday service time - edit in Admin]\nVenue: [Church address - edit in Admin]\n\nJoin us for our weekly Sunday gathering.",
  ],
  [
    "act_rejuvenators_service",
    "Rejuvenators Service",
    "Day: [Day - edit in Admin]\nTime: [Time - edit in Admin]\nVenue: [Venue - edit in Admin]\n\nA gathering for the Rejuvenators family.",
  ],
  [
    "act_prayer_meeting",
    "Prayer Meeting",
    "Day: [Day - edit in Admin]\nTime: [Time - edit in Admin]\nVenue: [Venue - edit in Admin]\n\nA time of corporate prayer and intercession.",
  ],
  [
    "act_bible_study",
    "Bible Study",
    "Day: [Day - edit in Admin]\nTime: [Time - edit in Admin]\nVenue: [Venue - edit in Admin]\n\nGrow in the Word together.",
  ],
  [
    "act_night_vigil",
    "Night Vigil",
    "Day: [Day - edit in Admin]\nTime: [Time - edit in Admin]\nVenue: [Venue - edit in Admin]\n\nA night of worship and prayer.",
  ],
  [
    "act_special_revival",
    "Special Revival Programs",
    "Day: [Dates - edit in Admin]\nTime: [Time - edit in Admin]\nVenue: [Venue - edit in Admin]\n\nSpecial revival meetings and outreaches.",
  ],
];

const faqs = [
  ["faq_location", "Where is the church located?", "[Church address - edit in Admin]"],
  ["faq_sunday_time", "What time is the Sunday service?", "[Sunday service time - edit in Admin]"],
  ["faq_membership", "How do I become a member?", "[Membership steps - edit in Admin]"],
  ["faq_department", "How do I join a department?", "[Department joining steps - edit in Admin]"],
  ["faq_book_pastor", "Can I book an appointment with the pastor?", "[Appointment booking details - edit in Admin]"],
  ["faq_register_first", "Do I need to register before attending?", "[Registration guidance - edit in Admin]"],
  ["faq_participate", "How can I participate in church activities?", "[Activity participation details - edit in Admin]"],
  ["faq_contact", "How do I contact the church?", "[Contact details - edit in Admin]"],
  ["faq_devotionals", "How do I access daily devotionals?", "[Devotional access details - edit in Admin]"],
];

for (const [id, key, title, body] of contentBlocks) {
  lines.push(
    `INSERT OR IGNORE INTO content_blocks (id, key, title, body, is_published, created_at, updated_at) VALUES (${q(id)}, ${q(key)}, ${q(title)}, ${q(body)}, 1, unixepoch() * 1000, unixepoch() * 1000);`,
  );
}

for (let index = 0; index < activities.length; index += 1) {
  const [id, title, description] = activities[index];
  lines.push(
    `INSERT OR IGNORE INTO activities (id, title, description, activity_date, is_published, created_at, updated_at) VALUES (${q(id)}, ${q(title)}, ${q(description)}, NULL, 1, unixepoch() * 1000, unixepoch() * 1000);`,
  );
}

for (let index = 0; index < faqs.length; index += 1) {
  const [id, question, answer] = faqs[index];
  lines.push(
    `INSERT OR IGNORE INTO faqs (id, question, answer, sort_order, is_published, created_at) VALUES (${q(id)}, ${q(question)}, ${q(answer)}, ${index + 1}, 1, unixepoch() * 1000);`,
  );
}

lines.push(
  `INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, status, must_change_password, created_at, updated_at) VALUES ('usr_super_admin', ${q(adminName)}, ${q(adminEmail)}, ${q("[Church phone - edit in Admin]")}, ${q(adminHash)}, 'active', 1, unixepoch() * 1000, unixepoch() * 1000);`,
  `INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) SELECT id, 'role_super_admin', unixepoch() * 1000 FROM users WHERE email = ${q(adminEmail)};`,
  `INSERT OR IGNORE INTO member_profiles (user_id, member_code, gender, registration_status, member_status, followup_status, show_phone, show_email, show_last_seen, approved_at, created_at, updated_at) SELECT id, 'IIF-ADMIN-0001', 'prefer_not_to_say', 'approved', 'active', 'completed', 0, 0, 0, unixepoch() * 1000, unixepoch() * 1000, unixepoch() * 1000 FROM users WHERE email = ${q(adminEmail)};`,
  `INSERT OR IGNORE INTO department_members (id, department_id, user_id, role, is_active, joined_at) SELECT 'dm_admin_content', 'dept_content', id, 'member', 1, unixepoch() * 1000 FROM users WHERE email = ${q(adminEmail)};`,
);

lines.push(
  `INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, status, must_change_password, created_at, updated_at) VALUES ('usr_test_member', ${q(memberName)}, ${q(memberEmail)}, '+10000000000', ${q(memberHash)}, 'active', 0, unixepoch() * 1000, unixepoch() * 1000);`,
  `INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) SELECT id, 'role_member', unixepoch() * 1000 FROM users WHERE email = ${q(memberEmail)};`,
  `INSERT OR IGNORE INTO member_profiles (user_id, member_code, gender, date_of_birth, address, occupation, bio, requested_department_id, registration_status, member_status, followup_status, show_phone, show_email, show_last_seen, approved_at, created_at, updated_at) SELECT id, 'IIF-MEMBER-0001', 'prefer_not_to_say', '1995-01-01', ${q("[Test member address]")}, ${q("Volunteer")}, ${q("Seeded member account for local testing.")}, 'dept_worship', 'approved', 'active', 'completed', 0, 0, 0, unixepoch() * 1000, unixepoch() * 1000, unixepoch() * 1000 FROM users WHERE email = ${q(memberEmail)};`,
  `INSERT OR IGNORE INTO department_members (id, department_id, user_id, role, is_active, joined_at) SELECT 'dm_member_worship', 'dept_worship', id, 'member', 1, unixepoch() * 1000 FROM users WHERE email = ${q(memberEmail)};`,
);

lines.push(
  `INSERT OR IGNORE INTO notification_preferences (id, user_id, type, in_app, email, whatsapp) SELECT 'np_admin_reg', id, 'member_registration', 1, 0, 0 FROM users WHERE email = ${q(adminEmail)};`,
  "COMMIT;",
);

const sqlPath = resolve(".wrangler", "seed.generated.sql");
mkdirSync(resolve(".wrangler"), { recursive: true });
writeFileSync(sqlPath, lines.join("\n"), "utf8");

console.log(`Seed SQL prepared (${lines.length} statements) for ${mode}.`);
console.log(`Super Admin: ${adminEmail}`);
console.log(`Test member: ${memberEmail}`);

const wranglerCli = resolve("node_modules", "wrangler", "bin", "wrangler.js");
const result = spawnSync(
  process.execPath,
  [
    wranglerCli,
    "d1",
    "execute",
    "itisfinished-db",
    remote ? "--remote" : "--local",
    "--file",
    sqlPath,
    "-y",
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("Seeding failed. Make sure migrations have been applied.");
  process.exit(result.status ?? 1);
}

console.log("Seed complete.");
