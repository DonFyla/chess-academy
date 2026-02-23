import { galleryMetadata } from "@/lib/metadata";
import GalleryClient from "./GalleryClient";

export const metadata = galleryMetadata;

export default function Gallery() {
  return <GalleryClient />;
}
