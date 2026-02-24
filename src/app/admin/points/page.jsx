import { adminMetadata } from "@/lib/metadata";
import AdminPointsClient from "./AdminPointsClient";

export const metadata = adminMetadata;

export default function AdminPointsPage() {
  return <AdminPointsClient />;
}
