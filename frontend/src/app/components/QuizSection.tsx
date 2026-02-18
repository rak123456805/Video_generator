import { useState, useEffect } from "react";
import { Brain, Loader2, CheckCircle2, XCircle, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import apiClient from "../../api/client";
import { useVideo } from "../contexts/VideoContext";

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
}

interface QuizSectionProps {
    topic: string;
    scriptSlides: any[];
    language: string;
}

export function QuizSection({ topic, scriptSlides, language }: QuizSectionProps) {
    const { videoData, setVideoData } = useVideo();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
    const [submittedQuestions, setSubmittedQuestions] = useState<boolean[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load quiz from context if available
    const questions = (videoData.quiz as QuizQuestion[]) || [];

    // Initialize answer arrays when questions change
    useEffect(() => {
        if (questions.length > 0 && selectedAnswers.length !== questions.length) {
            setSelectedAnswers(new Array(questions.length).fill(null));
            setSubmittedQuestions(new Array(questions.length).fill(false));
        }
    }, [questions.length]);

    const currentQuestion = questions[currentQuestionIndex];
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const currentAnswer = selectedAnswers[currentQuestionIndex];
    const isCurrentSubmitted = submittedQuestions[currentQuestionIndex];
    const allAnswered = selectedAnswers.every(a => a !== null);
    const allSubmitted = submittedQuestions.every(s => s);

    /* ---------------- GENERATE / SHOW QUIZ ---------------- */
    const handleGenerateQuiz = async () => {
        // If quiz already exists in context, just show it
        if (videoData.quiz && Array.isArray(videoData.quiz) && videoData.quiz.length > 0) {
            setVideoData({ showQuiz: true });
            setCurrentQuestionIndex(0);
            setSelectedAnswers(new Array(videoData.quiz.length).fill(null));
            setSubmittedQuestions(new Array(videoData.quiz.length).fill(false));
            setQuizCompleted(false);
            return;
        }

        // Try to fetch quiz by jobId (read-only, never regenerates)
        if (videoData.jobId) {
            setIsGenerating(true);
            setError(null);
            try {
                const res = await apiClient.get(`/video/quiz/${videoData.jobId}`);
                if (res.data.quiz_status === "completed" && res.data.questions) {
                    setVideoData({
                        quiz: res.data.questions,
                        showQuiz: true,
                    });
                    setCurrentQuestionIndex(0);
                    setSelectedAnswers(new Array(res.data.questions.length).fill(null));
                    setSubmittedQuestions(new Array(res.data.questions.length).fill(false));
                    setQuizCompleted(false);
                    setIsGenerating(false);
                    return;
                } else if (res.data.quiz_status === "processing") {
                    setError("Quiz is still being generated. Please wait a moment and try again.");
                    setIsGenerating(false);
                    return;
                } else {
                    setError("Quiz generation failed for this video. You can try generating a new one.");
                    setIsGenerating(false);
                    return;
                }
            } catch (err) {
                console.error("Failed to fetch quiz by jobId:", err);
                // Fall through to legacy path
            }
            setIsGenerating(false);
        }

        // Legacy fallback: generate via API if no jobId and no quiz
        if (!topic || topic.trim() === '') {
            setError("No video content available. Please generate a video first.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const res = await apiClient.post("/quiz/generate", {
                topic,
                scriptSlides: scriptSlides || [],
                language,
                questionCount: 10
            });

            // Save quiz to context (localStorage)
            setVideoData({
                quiz: res.data.questions,
                showQuiz: true
            });

            setCurrentQuestionIndex(0);
            setSelectedAnswers(new Array(res.data.questions.length).fill(null));
            setSubmittedQuestions(new Array(res.data.questions.length).fill(false));
            setQuizCompleted(false);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to generate quiz. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    /* ---------------- ANSWER SELECTION ---------------- */
    const handleAnswerSelect = (optionIndex: number) => {
        if (isCurrentSubmitted) return; // Prevent changing after submission
        const updated = [...selectedAnswers];
        updated[currentQuestionIndex] = optionIndex;
        setSelectedAnswers(updated);
    };

    /* ---------------- SUBMIT ANSWER ---------------- */
    const handleSubmitAnswer = () => {
        if (currentAnswer === null) return;
        const updated = [...submittedQuestions];
        updated[currentQuestionIndex] = true;
        setSubmittedQuestions(updated);
    };

    /* ---------------- NAVIGATION ---------------- */
    const handlePreviousQuestion = () => {
        if (!isFirstQuestion) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleNextQuestion = () => {
        if (!isLastQuestion) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleGoToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    const handleFinishQuiz = () => {
        setQuizCompleted(true);
    };

    /* ---------------- RETRY QUIZ ---------------- */
    const handleRetryQuiz = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers(new Array(questions.length).fill(null));
        setSubmittedQuestions(new Array(questions.length).fill(false));
        setQuizCompleted(false);
    };

    /* ---------------- CALCULATE SCORE ---------------- */
    const calculateScore = () => {
        let correct = 0;
        selectedAnswers.forEach((answer, index) => {
            if (answer === questions[index]?.correctAnswer) {
                correct++;
            }
        });
        return correct;
    };

    const score = calculateScore();
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    // Determine button label
    const hasExistingQuiz = videoData.quiz && Array.isArray(videoData.quiz) && videoData.quiz.length > 0;

    /* ---------------- RENDER: INITIAL STATE ---------------- */
    if (questions.length === 0 && !isGenerating) {
        return (
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <Brain className="w-6 h-6 text-purple-600" />
                    <h3 className="text-2xl font-bold">Quiz Generator</h3>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Test your knowledge with an AI-generated quiz based on your video content.
                </p>

                <button
                    onClick={handleGenerateQuiz}
                    disabled={!topic || topic.trim() === ''}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 
                     hover:from-purple-700 hover:to-indigo-700 text-white p-4 rounded-xl
                     font-semibold text-lg transition-all duration-300
                     shadow-lg hover:shadow-xl transform hover:-translate-y-1
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    <Brain className="inline mr-2" />
                    {hasExistingQuiz ? "Show Quiz" : "Generate Quiz"}
                </button>

                {(!topic || topic.trim() === '') && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                        Generate a video first to create a quiz
                    </p>
                )}
            </div>
        );
    }

    /* ---------------- RENDER: LOADING ---------------- */
    if (isGenerating) {
        return (
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative mb-4">
                        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-full"></div>
                        </div>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                        Generating Your Quiz
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-center">
                        Creating personalized questions based on your video content...
                    </p>
                </div>
            </div>
        );
    }

    /* ---------------- RENDER: QUIZ COMPLETED ---------------- */
    if (quizCompleted) {
        const getGrade = () => {
            if (percentage >= 90) return { grade: "A+", color: "text-green-600 dark:text-green-400", message: "Outstanding!" };
            if (percentage >= 80) return { grade: "A", color: "text-green-600 dark:text-green-400", message: "Excellent!" };
            if (percentage >= 70) return { grade: "B", color: "text-blue-600 dark:text-blue-400", message: "Good job!" };
            if (percentage >= 60) return { grade: "C", color: "text-yellow-600 dark:text-yellow-400", message: "Not bad!" };
            return { grade: "D", color: "text-red-600 dark:text-red-400", message: "Keep practicing!" };
        };

        const gradeInfo = getGrade();

        return (
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 mb-4">
                        <CheckCircle2 className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
                    <p className="text-gray-600 dark:text-gray-400">{gradeInfo.message}</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6">
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Your Score</p>
                        <p className="text-5xl font-bold mb-2">
                            {score}/{questions.length}
                        </p>
                        <p className={`text-2xl font-semibold ${gradeInfo.color}`}>
                            {percentage}% - Grade: {gradeInfo.grade}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
                    {questions.map((q, index) => {
                        const userAnswer = selectedAnswers[index];
                        const isCorrect = userAnswer === q.correctAnswer;

                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-xl border-2 ${isCorrect
                                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                    : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                                    }`}
                            >
                                <div className="flex items-start gap-3 mb-2">
                                    {isCorrect ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold mb-2">
                                            {index + 1}. {q.question}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Your answer: <span className={isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{userAnswer !== null ? q.options[userAnswer] : "Not answered"}</span>
                                        </p>
                                        {!isCorrect && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Correct answer: <span className="text-green-600 dark:text-green-400">{q.options[q.correctAnswer]}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleRetryQuiz}
                        className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 
                       dark:border-gray-600 hover:border-purple-400 
                       dark:hover:border-purple-500 bg-white dark:bg-gray-800
                       text-gray-800 dark:text-white font-medium
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-all duration-300 shadow-md hover:shadow-lg
                       flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Retry Quiz
                    </button>
                    <button
                        onClick={() => {
                            // Force regenerate a new quiz via API
                            setVideoData({ quiz: null, showQuiz: false });
                            setSelectedAnswers([]);
                            setSubmittedQuestions([]);
                            setQuizCompleted(false);
                        }}
                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 
                       hover:from-purple-700 hover:to-indigo-700 text-white font-medium
                       transition-all duration-300 shadow-lg hover:shadow-xl
                       transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <Brain className="w-4 h-4" />
                        Generate New Quiz
                    </button>
                </div>
            </div>
        );
    }

    /* ---------------- RENDER: ACTIVE QUIZ ---------------- */
    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Question Navigation Dots */}
            <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {questions.map((_, index) => {
                    const isAnswered = selectedAnswers[index] !== null;
                    const isSubmitted = submittedQuestions[index];
                    const isCurrent = index === currentQuestionIndex;
                    const isCorrect = isSubmitted && selectedAnswers[index] === questions[index].correctAnswer;
                    const isWrong = isSubmitted && selectedAnswers[index] !== questions[index].correctAnswer;

                    let dotClass = "w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all duration-200 ";
                    if (isCurrent) {
                        dotClass += "ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800 ";
                    }
                    if (isCorrect) {
                        dotClass += "bg-green-500 text-white";
                    } else if (isWrong) {
                        dotClass += "bg-red-500 text-white";
                    } else if (isAnswered) {
                        dotClass += "bg-purple-500 text-white";
                    } else {
                        dotClass += "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600";
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleGoToQuestion(index)}
                            className={dotClass}
                            title={`Question ${index + 1}`}
                        >
                            {index + 1}
                        </button>
                    );
                })}
            </div>

            {/* Question */}
            <div className="mb-6">
                <h3 className="text-2xl font-bold mb-6">{currentQuestion.question}</h3>

                {/* Options */}
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = currentAnswer === index;
                        const isCorrect = index === currentQuestion.correctAnswer;
                        const showCorrectness = isCurrentSubmitted;

                        let optionClass = "p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ";

                        if (showCorrectness) {
                            if (isCorrect) {
                                optionClass += "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600";
                            } else if (isSelected && !isCorrect) {
                                optionClass += "border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600";
                            } else {
                                optionClass += "border-gray-300 dark:border-gray-600 opacity-50";
                            }
                        } else {
                            if (isSelected) {
                                optionClass += "border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500";
                            } else {
                                optionClass += "border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500";
                            }
                        }

                        return (
                            <div
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={optionClass}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${showCorrectness && isCorrect
                                        ? "border-green-500 bg-green-500"
                                        : showCorrectness && isSelected && !isCorrect
                                            ? "border-red-500 bg-red-500"
                                            : isSelected
                                                ? "border-purple-500 bg-purple-500"
                                                : "border-gray-400"
                                        }`}>
                                        {showCorrectness && isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        {showCorrectness && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="flex-1">{option}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Explanation */}
            {isCurrentSubmitted && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Explanation:</p>
                    <p className="text-blue-800 dark:text-blue-200">{currentQuestion.explanation}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                {/* Previous Button */}
                <button
                    onClick={handlePreviousQuestion}
                    disabled={isFirstQuestion}
                    className="px-5 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600
                     hover:border-purple-400 dark:hover:border-purple-500
                     bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                     font-medium transition-all duration-300
                     disabled:opacity-30 disabled:cursor-not-allowed
                     flex items-center gap-1"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                </button>

                {/* Submit / Next / Finish */}
                <div className="flex-1">
                    {!isCurrentSubmitted ? (
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={currentAnswer === null}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 
                           hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-xl
                           font-semibold text-lg transition-all duration-300
                           shadow-lg hover:shadow-xl transform hover:-translate-y-1
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            Submit Answer
                        </button>
                    ) : isLastQuestion && allSubmitted ? (
                        <button
                            onClick={handleFinishQuiz}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 
                           hover:from-green-700 hover:to-emerald-700 text-white p-3 rounded-xl
                           font-semibold text-lg transition-all duration-300
                           shadow-lg hover:shadow-xl transform hover:-translate-y-1
                           flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            View Results
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            disabled={isLastQuestion}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 
                           hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-xl
                           font-semibold text-lg transition-all duration-300
                           shadow-lg hover:shadow-xl transform hover:-translate-y-1
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                           flex items-center justify-center gap-2"
                        >
                            Next Question
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Unanswered count indicator */}
            {!allSubmitted && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                    {submittedQuestions.filter(s => s).length} of {questions.length} questions answered
                </p>
            )}
        </div>
    );
}
