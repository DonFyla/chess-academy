import { bookMetadata } from "@/lib/metadata";
import BookClient from "./BookClient";

export const metadata = bookMetadata;

export default function BookPage() {
  return <BookClient />;
}
