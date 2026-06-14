import { adminMetadata } from "@/lib/metadata";
import AdminClassesClient from "./AdminClassesClient";

export const metadata = adminMetadata;

export default function AdminClassesPage() {
  return <AdminClassesClient />;
}
