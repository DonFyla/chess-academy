import { intermediateCourseMetadata } from "@/lib/metadata";
import IntermediateClient from "./IntermediateClient";

export const metadata = intermediateCourseMetadata;

export default function CourseDetail() {
  return <IntermediateClient />;
}
