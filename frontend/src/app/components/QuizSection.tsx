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
            <div className="max-w-4xl mx-auto bg-[#0b031a]/60 border border-purple-500/20 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
                    <h3 className="text-2xl font-bold text-white">Quiz Generator</h3>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                )}

                <p className="text-slate-300 mb-6 leading-relaxed">
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
                    <p className="text-sm text-slate-500 mt-4 text-center">
                        Generate a video first to create a quiz
                    </p>
                )}
            </div>
        );
    }

    /* ---------------- RENDER: LOADING ---------------- */
    if (isGenerating) {
        return (
            <div className="max-w-4xl mx-auto bg-[#0b031a]/60 border border-purple-500/20 rounded-2xl p-8 shadow-xl">
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative mb-4">
                        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                        Generating Your Quiz
                    </h4>
                    <p className="text-slate-400 text-center">
                        Creating personalized questions based on your video content...
                    </p>
                </div>
            </div>
        );
    }

    /* ---------------- RENDER: QUIZ COMPLETED ---------------- */
    if (quizCompleted) {
        const getGrade = () => {
            if (percentage >= 90) return { grade: "A+", color: "text-green-400", message: "Outstanding!" };
            if (percentage >= 80) return { grade: "A", color: "text-green-400", message: "Excellent!" };
            if (percentage >= 70) return { grade: "B", color: "text-blue-400", message: "Good job!" };
            if (percentage >= 60) return { grade: "C", color: "text-yellow-400", message: "Not bad!" };
            return { grade: "D", color: "text-red-400", message: "Keep practicing!" };
        };

        const gradeInfo = getGrade();

        return (
            <div className="max-w-4xl mx-auto bg-[#0b031a]/60 border border-purple-500/20 rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-950/30 border border-purple-500/20 mb-4">
                        <CheckCircle2 className="w-10 h-10 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-white">Quiz Completed!</h2>
                    <p className="text-slate-400">{gradeInfo.message}</p>
                </div>

                <div className="bg-purple-950/20 border border-purple-500/10 rounded-xl p-6 mb-6">
                    <div className="text-center">
                        <p className="text-slate-400 mb-2">Your Score</p>
                        <p className="text-5xl font-bold mb-2 text-white">
                            {score}/{questions.length}
                        </p>
                        <p className={`text-2xl font-semibold ${gradeInfo.color}`}>
                            {percentage}% - Grade: {gradeInfo.grade}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-white">Review Your Answers</h3>
                    {questions.map((q, index) => {
                        const userAnswer = selectedAnswers[index];
                        const isCorrect = userAnswer === q.correctAnswer;

                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-xl border-2 ${isCorrect
                                    ? "border-green-500/20 bg-green-500/5"
                                    : "border-red-500/20 bg-red-500/5"
                                    }`}
                            >
                                <div className="flex items-start gap-3 mb-2">
                                    {isCorrect ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold mb-2 text-white">
                                            {index + 1}. {q.question}
                                        </p>
                                        <p className="text-sm text-slate-300">
                                            Your answer: <span className={isCorrect ? "text-green-400" : "text-red-400"}>{userAnswer !== null ? q.options[userAnswer] : "Not answered"}</span>
                                        </p>
                                        {!isCorrect && (
                                            <p className="text-sm text-slate-400 mt-1">
                                                Correct answer: <span className="text-green-400 font-medium">{q.options[q.correctAnswer]}</span>
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
                        className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-700 
                       hover:border-purple-400 bg-slate-900
                       text-slate-200 font-medium hover:bg-slate-800
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
        <div className="max-w-4xl mx-auto bg-[#0b031a]/60 border border-purple-500/20 rounded-2xl p-8 shadow-xl">
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-400">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-sm font-medium text-purple-400">
                        {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                    </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5">
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
                        dotClass += "ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950 ";
                    }
                    if (isCorrect) {
                        dotClass += "bg-green-500 text-white";
                    } else if (isWrong) {
                        dotClass += "bg-red-500 text-white";
                    } else if (isAnswered) {
                        dotClass += "bg-purple-500 text-white";
                    } else {
                        dotClass += "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white";
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
                <h3 className="text-2xl font-bold mb-6 text-white leading-snug">{currentQuestion.question}</h3>

                {/* Options */}
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = currentAnswer === index;
                        const isCorrect = index === currentQuestion.correctAnswer;
                        const showCorrectness = isCurrentSubmitted;

                        let optionClass = "p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ";

                        if (showCorrectness) {
                            if (isCorrect) {
                                optionClass += "border-green-500 bg-green-500/10";
                            } else if (isSelected && !isCorrect) {
                                optionClass += "border-red-500 bg-red-500/10";
                            } else {
                                optionClass += "border-slate-800 opacity-40 text-slate-500";
                            }
                        } else {
                            if (isSelected) {
                                optionClass += "border-purple-500 bg-purple-500/10";
                            } else {
                                optionClass += "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-purple-400 hover:text-white";
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
                                                : "border-gray-500"
                                        }`}>
                                        {showCorrectness && isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        {showCorrectness && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="flex-1 text-sm font-medium">{option}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Explanation */}
            {isCurrentSubmitted && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="font-semibold text-blue-300 mb-2">Explanation:</p>
                    <p className="text-blue-200">{currentQuestion.explanation}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                {/* Previous Button */}
                <button
                    onClick={handlePreviousQuestion}
                    disabled={isFirstQuestion}
                    className="px-5 py-3 rounded-xl border-2 border-slate-700
                     bg-slate-900 text-slate-300
                     font-medium transition-all duration-300
                     hover:bg-slate-800 hover:border-purple-500
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
                <p className="text-sm text-slate-500 mt-4 text-center">
                    {submittedQuestions.filter(s => s).length} of {questions.length} questions answered
                </p>
            )}
        </div>
    );
}
