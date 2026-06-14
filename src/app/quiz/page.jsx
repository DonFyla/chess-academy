import { quizMetadata } from "@/lib/metadata";
import QuizApp from '@/components/home/Quiz';

export const metadata = quizMetadata;

export default function QuizPage() {
  return <QuizApp />;
}
