import { expertCourseMetadata } from "@/lib/metadata";
import ExpertClient from "./ExpertClient";

export const metadata = expertCourseMetadata;

export default function CourseDetail() {
  return <ExpertClient />;
}
