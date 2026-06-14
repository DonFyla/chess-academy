import { bookWithPointsMetadata } from "@/lib/metadata";
import BookWithPointsClient from "./BookWithPointsClient";

export const metadata = bookWithPointsMetadata;

export default function BookWithPointsPage() {
  return <BookWithPointsClient />;
}
