import { adminMetadata } from "@/lib/metadata";
import CoachAvailabilityClient from "./CoachAvailabilityClient";

export const metadata = adminMetadata;

export default function CoachAvailabilityPage() {
  return <CoachAvailabilityClient />;
}
