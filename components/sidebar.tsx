"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  CalendarClock, 
  Settings,
  Bot,
  LogOut
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useDispatch, useSelector } from "react-redux";
import { setLanguage } from "@/redux/features/languageSlice";
import { RootState } from "@/redux/store";
import { useTranslations } from "@/hooks/use-translations"; // Ensure you have this component
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  collapsed?: boolean;
}

const NavButton = ({ 
  className, 
  active, 
  children, 
  ...props 
}: {
  className?: string;
  active?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "bg-transparent", 
        "hover:bg-[#443760]",
        active && "bg-sidebar-accent text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const NavItem = ({ href, label, icon, active, collapsed }: NavItemProps) => {
  if (collapsed) {
    return (
      <Link href={href} className="w-full">
        <NavButton 
          active={active}
          className="w-10 h-10 p-2"
        >
          {icon}
        </NavButton>
      </Link>
    );
  }

  return (
    <Link href={href} className="w-full">
      <NavButton
        active={active}
        className="w-full justify-start px-2 py-2 mb-4"
      >
        {icon}
        <span className="ml-2">{label}</span>
      </NavButton>
    </Link>
  );
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();
  const { currentLanguage } = useSelector((state: RootState) => state.language);
  const { t } = useTranslations();

  const handleLogout = () => {
    auth.logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const currentUser = auth.getCurrentUser();
  const isAdmin = Boolean(currentUser?.admin);
  
  const navigationItems = [
    {
      href: "/",
      label: t("welcome"),
      icon: <LayoutDashboard size={20} />,
    },
    {
      href: "/leads",
      label: t("leads"),
      icon: <Users size={20} />,
    },
    {
      href: "/crmsystem",
      label: t("CRM System"),
      icon: <Users size={20} />,
    },
    {
      href: "/email-prompting",
      label: t("emailPrompting"),
      icon: <Mail size={20} />,
    },
    {
      href: "/email-responses",
      label: t("emailResponses"),
      icon: <Bot size={20} />,
    },
    {
      href: "/booking",
      label: t("booking"),
      icon: <CalendarClock size={20} />,
    },
    // Show Admin-only section: All Leads
    ...(isAdmin ? [{
      href: "/allleads",
      label: "All Leads",
      icon: <Users size={20} />,
    }] : []),
    {
      href: "/account-settings",
      label: "Account Settings",
      icon: <Settings size={20} />,
    }
  ];

  return (
    <aside
      className={cn(
        "border-r h-screen fixed left-0 top-0 z-20 transition-all duration-300 bg-sidebar-background text-sidebar-foreground",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
            <img 
              src="/quasaralogo.png" 
              alt="QuasarLeads Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg">QuasarLeads</span>
          )}
        </div>
      </div>

      <div className="px-2 mt-5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-4 py-2 ">
            {navigationItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                // @ts-ignore
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
                collapsed={true}
              />
            ))}
          </div>
        ) : (
          <>
            {navigationItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                // @ts-ignore
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
          </>
        )}
      </div>

      <div className="px-4 py-4 absolute bottom-0 w-full">
        <div className="flex items-center justify-between mb-4">
          {!collapsed && (
            <>
              <div className="text-xs text-muted-foreground">
                QuasarLeads v1.0
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">EN</span>
                <Switch
                  id="languageToggle"
                  checked={currentLanguage === "nl"}
                  onCheckedChange={(checked) => dispatch(setLanguage(checked ? "nl" : "en"))}
                  className={cn(
                    "data-[state=checked]:bg-fuchsia-600",
                    "bg-gray-300"
                  )}
                />
                <span className="text-xs text-muted-foreground">NL</span>
              </div>
            </>
          )}
        </div>
        
        {/* Logout Button */}
        <div className="px-2">
          <NavButton
            onClick={handleLogout}
            className={collapsed ? "w-10 h-10 p-2" : "w-full justify-start px-2 py-2"}
          >
            <LogOut size={20} />
            {!collapsed && <span className="ml-2">Logout</span>}
          </NavButton>
        </div>
      </div>
    </aside>
  );
}
