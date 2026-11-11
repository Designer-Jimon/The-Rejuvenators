export type PublicNavItem = {
  href: string;
  label: string;
  children?: ReadonlyArray<{ href: string; label: string }>;
};
