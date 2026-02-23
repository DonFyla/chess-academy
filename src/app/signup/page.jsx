import { signupMetadata } from "@/lib/metadata";
import SignupClient from "./SignupClient";

export const metadata = signupMetadata;

export default function SignupPage() {
  return <SignupClient />;
}
