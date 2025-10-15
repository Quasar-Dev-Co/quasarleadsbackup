"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";

type StatusType = "active" | "emailed" | "replied" | "booked" | "inactive";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslations();

  const getStatusStyles = () => {
    switch (status) {
      case "active":
        return "bg-blue-500/20 text-blue-500 border-blue-500/50";
      case "emailed":
        return "bg-amber-500/20 text-amber-500 border-amber-500/50";
      case "replied":
        return "bg-green-500/20 text-green-500 border-green-500/50";
      case "booked":
        return "bg-quasar-500/20 text-quasar-500 border-quasar-500/50";
      case "inactive":
        return "bg-gray-500/20 text-gray-500 border-gray-500/50";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/50";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "active":
        return t("Active");
      case "emailed":
        return t("Emailed");
      case "replied":
        return t("Replied");
      case "booked":
        return t("Booked");
      case "inactive":
        return t("Inactive");
      default:
        // @ts-ignore
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getStatusStyles(),
        className
      )}
    >
      {getStatusText()}
    </span>
  );
}