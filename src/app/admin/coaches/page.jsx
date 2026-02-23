import { adminMetadata } from "@/lib/metadata";
import AdminCoachesClient from "./AdminCoachesClient";

export const metadata = adminMetadata;

export default function AdminCoachesPage() {
  return <AdminCoachesClient />;
}
