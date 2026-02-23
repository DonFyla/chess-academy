import { loginMetadata } from "@/lib/metadata";
import LoginClient from "./LoginClient";

export const metadata = loginMetadata;

export default function LoginPage() {
  return <LoginClient />;
}
