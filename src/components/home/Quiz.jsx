// components/QuizApp.js
"use client";
import React from "react";
import { useState, useRef } from "react";
import { toPng } from 'html-to-image';
import QtakerCard from "../cards/QtakerCard";
import QuestionCard from "../cards/QuestionCard";
import AnswerCard from "../cards/AnswerCard";
import { useQuiz } from "../hooks/useQuiz";
import ShareLinkBox from "../cards/CopyButtonCard";

function QuizApp() {
  // Add these hooks at top of your component function
  const resultCardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const {
    currentView,
    qtaker,
    currentQuestion,
    answerData,
    answerId,
    score,
    loading,
    error,
    createQtaker,
    getQuestion,
    submitAnswer,
    getAnswerDetails,
    getResults,
    navigateToView,
    setError,
  } = useQuiz();

  // Handle Qtaker registration
  const handleCreateQtaker = async (formData) => {
    try {
      const data = await createQtaker(formData);
      // Fetch the first question
      await getQuestion(data.qtaker_id, data.question_id);
    } catch (error) {
      console.error('Failed to create qtaker:', error);
    }
  };

  // Clear error when user starts typing in the form
  const handleClearError = () => {
    if (error) {
      setError(null);
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = async (answer) => {
    if (!qtaker || !currentQuestion) return;

    try {
      // 1. submit – returns last_answer_id
      const res = await submitAnswer(qtaker.id, currentQuestion.id, answer);
      if (res.last_answer_id === undefined) throw new Error('Server did not return last_answer_id');

      // 2. details – use the id from the response
      await getAnswerDetails(qtaker.id, res.last_answer_id);
    } catch (err) {
      console.error('Submit / details failed:', err);
    }
  };

  // Handle next question
  const handleNextQuestion = async () => {
    if (!answerData?.next_question?.id) {
      console.log('No valid next question - showing results');
      await getResults(qtaker.id);
    } else {
      console.log('Moving to next question with ID:', answerData.next_question.id);
      await getQuestion(qtaker.id, answerData.next_question.id);
      navigateToView('question');
    }
  };

  // Handle starting next questionnaire
  const handleStartNextQuestionnaire = async () => {
    try {
      // Get the next questionnaire data from answerData
      const nextQuestionnaire = answerData?.next_questionnaire;
      if (nextQuestionnaire && nextQuestionnaire.first_question_id) {
        await getQuestion(qtaker.id, nextQuestionnaire.first_question_id);
        navigateToView('question');
      } else {
        console.error('No next questionnaire data available');
      }
    } catch (error) {
      console.error('Error starting next questionnaire:', error);
    }
  };

  // Render error message
  if (error && currentView !== 'registration') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate result data once for the result view
  const resultData = (() => {
    if (currentView !== "result") return null;

    const displayScore = answerData?.score ?? 0;
    const totalQuestions = answerData?.total_questions ?? 'N/A';
    const percentage = answerData?.percentage ?? 0;
    const passed = answerData?.passed ?? false;
    const currentSkill = answerData?.current_skill || 'beginner';
    const nextSkill = answerData?.next_skill;
    const nextQuestionnaire = answerData?.next_questionnaire;
    const showJoinClassesMessage = !passed || (passed && !nextQuestionnaire);

    console.log('Result Data:', answerData);
    console.log('Current Skill (from API):', currentSkill);

    return {
      displayScore,
      totalQuestions,
      percentage,
      passed,
      currentSkill,
      nextSkill,
      nextQuestionnaire,
      showJoinClassesMessage
    };
  })();

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case "registration":
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 flex items-center justify-center">
            <QtakerCard
              onSubmit={handleCreateQtaker}
              isLoading={loading}
              error={error}
              onClearError={handleClearError}
            />
          </div>
        );

      case "question":
        return (
          <div className="min-h-screen bg-gray-100 py-8 px-4">
            <QuestionCard
              question={currentQuestion}
              qtaker={qtaker}
              onSubmitAnswer={handleSubmitAnswer}
              isLoading={loading}
            />
          </div>
        );

      case "answer":
        return (
          <div className="min-h-screen bg-gray-100 py-8 px-4">
            <AnswerCard
              answer={answerData?.answer}
              correctAnswer={answerData?.correct_answer}
              question={answerData?.question}
              nextQuestion={answerData?.next_question}
              score={score}
              qtaker={qtaker}
              onNextQuestion={handleNextQuestion}
              isLoading={loading}
            />
          </div>
        );

      case "result":
        if (!resultData) return null;



        // Add these functions inside your component
        const generateResultImage = async () => {
          if (!resultCardRef.current) return null;
          try {
            setIsSharing(true);
            await new Promise(resolve => setTimeout(resolve, 100));
            const dataUrl = await toPng(resultCardRef.current, {
              quality: 1,
              pixelRatio: 2,
              backgroundColor: '#f0fdf4',
            });
            return dataUrl;
          } catch (err) {
            console.error('Failed:', err);
            return null;
          } finally {
            setIsSharing(false);
          }
        };

        const handleShare = async () => {
          const imageUrl = await generateResultImage();
          if (!imageUrl) return;
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], `result-${currentSkill}.png`, { type: 'image/png' });
          const shareText = passed
            ? `I passed ${currentSkill} with ${percentage.toFixed(1)}%!`
            : `I scored ${percentage.toFixed(1)}% on ${currentSkill}`;

          if (navigator.canShare?.({ files: [file] })) {
            try {
              await navigator.share({ title: 'My Result', text: shareText, files: [file] });
            } catch (err) {
              if (err.name !== 'AbortError') {
                const link = document.createElement('a');
                link.download = `my-result.png`;
                link.href = imageUrl;
                link.click();
              }
            }
          } else {
            const link = document.createElement('a');
            link.download = `my-result.png`;
            link.href = imageUrl;
            link.click();
          }
        };

        const { percentage, passed, currentSkill, nextSkill, nextQuestionnaire, showJoinClassesMessage } = resultData;

        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 flex items-center justify-center">
            {/* This div gets captured - ADD REF HERE */}
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full" ref={resultCardRef}>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-green-600 mb-4">
                  Assessment Complete!
                </h2>

                <div className="mb-6">
                  <p className="text-lg font-semibold mb-2">
                    Candidate: <span className="text-green-600">
                      {qtaker?.name}
                    </span>
                  </p>
                  <p className="text-lg font-semibold mb-2">
                    Score: <span className={percentage >= 60 ? "text-green-600" : "text-red-600"}>
                      {percentage.toFixed(1)}%
                    </span>
                  </p>
                  <p className={`text-sm font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {passed ? '🎉 Congratulations! You passed!' : 'Keep practicing!'}
                  </p>
                  {passed && nextQuestionnaire && (
                    <div className="m-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-800 mb-2">
                        Ready for the next level?
                      </h3>
                      <p className="text-blue-700 text-sm mb-4">
                        You have unlocked the <strong>{nextSkill}</strong> questionnaire!
                      </p>
                      <button
                        onClick={handleStartNextQuestionnaire}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start {nextSkill} Questionnaire
                      </button>
                    </div>
                  )}
                 
                </div>

                {/* Skill Badge */}
                <div className="mb-2 inline-block px-4 py-2 bg-green-50 rounded-full border border-green-100">
                  <span className="text-green-800 text-sm font-semibold">Level: {currentSkill}</span>
                </div>

                {showJoinClassesMessage && (
                  <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800 mb-2">
                      {passed ? 'Continue Your Journey!' : 'Time to Improve!'}
                    </h3>
                    <a   href="https://wa.link/uj48gk" className="text-yellow-700 text-sm">
                      {!passed ? `Your current level is ${currentSkill}. Ready for a coach to take you to the next level? Click here`
                        : `You've mastered ${currentSkill}! Join our classes.`
                      }
                    </a>
                   

                  </div>
                )}

                {/* Hidden footer for image branding */}
                <div className="mt-2 pt-4 border-t border-gray-100 text-xs text-gray-400">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Controls - Outside capture area */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 mt-4">
              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-xl border border-gray-100">
                <ShareLinkBox />
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50"
                >
                  {isSharing ? 'Generating...' : 'Share Result'}
                </button>
              </div>

              {showJoinClassesMessage && (
                <a
                  href={`/${currentSkill}`}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg"
                >
                  View {currentSkill} Course
                </a>
              )}
            </div>

            {/* Side actions */}
            <div className="fixed top-8 right-8 space-y-3">
              {/* {passed && nextQuestionnaire && (
                <button
                  onClick={handleStartNextQuestionnaire}
                  className="block w-full bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700"
                >
                  Next: {nextSkill}
                </button>
              )} */}
              <button
                onClick={() => navigateToView('registration')}
                className="block w-full bg-gray-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-gray-700"
              >
                New Assessment
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return renderCurrentView();
}

export default QuizApp;