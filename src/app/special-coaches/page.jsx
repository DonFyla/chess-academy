import { specialCoachesMetadata } from "@/lib/metadata";
import SpecialCoachesClient from "./SpecialCoachesClient";

export const metadata = specialCoachesMetadata;

export default function SpecialCoachesPage() {
  return <SpecialCoachesClient />;
}
