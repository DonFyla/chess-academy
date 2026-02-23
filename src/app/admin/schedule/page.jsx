import { adminMetadata } from "@/lib/metadata";
import AdminScheduleClient from "./AdminScheduleClient";

export const metadata = adminMetadata;

export default function AdminSchedulePage() {
  return <AdminScheduleClient />;
}
