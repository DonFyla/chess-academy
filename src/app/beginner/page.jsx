import { beginnerCourseMetadata } from "@/lib/metadata";
import BeginnerClient from "./BeginnerClient";

export const metadata = beginnerCourseMetadata;

export default function CourseDetail() {
  return <BeginnerClient />;
}
