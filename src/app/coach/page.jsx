import { adminMetadata } from "@/lib/metadata";
import CoachPortalClient from "./CoachPortalClient";

export const metadata = adminMetadata;

export default function CoachPortalPage() {
  return <CoachPortalClient />;
}
