import { buyPointsMetadata } from "@/lib/metadata";
import BuyPointsClient from "./BuyPointsClient";

export const metadata = buyPointsMetadata;

export default function BuyPointsPage() {
  return <BuyPointsClient />;
}
