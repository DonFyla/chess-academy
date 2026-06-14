import { signupMetadata } from "@/lib/metadata";
import SignupClient from "./SignupClient";
import RecaptchaProvider from "@/components/RecaptchaProvider";

export const metadata = signupMetadata;

export default function SignupPage() {
  return (
    <RecaptchaProvider>
      <SignupClient />
    </RecaptchaProvider>
  );
}
