import { dashboardMetadata } from "@/lib/metadata";
import DashboardClient from "./DashboardClient";

export const metadata = dashboardMetadata;

export default function DashboardPage() {
  return <DashboardClient />;
}
