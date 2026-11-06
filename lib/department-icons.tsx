import {
  Baby,
  BookOpen,
  Camera,
  Church,
  Cross,
  HandHeart,
  HeartHandshake,
  Mic,
  Music,
  PenLine,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type DepartmentIconOption = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

export const DEPARTMENT_ICON_OPTIONS: DepartmentIconOption[] = [
  { key: "heart", label: "Hands / care", Icon: HeartHandshake },
  { key: "mic", label: "Microphone / worship", Icon: Mic },
  { key: "camera", label: "Camera / media", Icon: Camera },
  { key: "hand", label: "Welcome / ushering", Icon: HandHeart },
  { key: "wrench", label: "Technical / tools", Icon: Wrench },
  { key: "pen", label: "Writing / content", Icon: PenLine },
  { key: "sparkles", label: "Cleaning / excellence", Icon: Sparkles },
  { key: "users", label: "People / general", Icon: Users },
  { key: "music", label: "Music", Icon: Music },
  { key: "book", label: "Bible study", Icon: BookOpen },
  { key: "cross", label: "Cross / prayer", Icon: Cross },
  { key: "church", label: "Church", Icon: Church },
  { key: "baby", label: "Children", Icon: Baby },
];

export function getDepartmentIcon(key: string | null | undefined) {
  return (
    DEPARTMENT_ICON_OPTIONS.find((option) => option.key === key)?.Icon ??
    HeartHandshake
  );
}

export function DepartmentIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = getDepartmentIcon(name);
  return <Icon className={className} aria-hidden="true" />;
}
