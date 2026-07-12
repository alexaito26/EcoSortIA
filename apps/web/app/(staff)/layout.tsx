import { requireRole } from "@/lib/auth/session";
import { navForRole } from "@/lib/auth/roles";
import { StaffShell } from "@/components/staff/staff-shell";

const STAFF_ROLES = ["admin", "operator", "viewer"] as const;

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(STAFF_ROLES);

  return (
    <StaffShell
      navItems={navForRole(profile.role)}
      profile={{ email: profile.email, full_name: profile.full_name, role: profile.role }}
    >
      {children}
    </StaffShell>
  );
}
