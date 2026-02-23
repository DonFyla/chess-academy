import { adminMetadata } from "@/lib/metadata";
import TestEmailClient from "./TestEmailClient";

export const metadata = adminMetadata;

export default function TestEmailPage() {
  return <TestEmailClient />;
}
