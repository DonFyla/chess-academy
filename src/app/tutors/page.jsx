import { tutorsMetadata } from "@/lib/metadata";
import TutorsClient from "./TutorsClient";

export const metadata = tutorsMetadata;

export default function TutorsPage() {
  return <TutorsClient />;
}
