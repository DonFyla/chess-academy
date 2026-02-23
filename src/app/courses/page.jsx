import CoursesClient from "./CoursesClient";
import { coursesMetadata } from "@/lib/metadata";

export const metadata = coursesMetadata;

export default function CoursesPage() {
  return <CoursesClient />;
}
