import { useState, useEffect } from "react";
import { Brain, Loader2, CheckCircle2, XCircle, ChevronRight, ChevronLeft, RotateCcw, Video, Play } from "lucide-react";
import apiClient from "../../api/client";
import { useVideo } from "../contexts/VideoContext";
import { useAuth } from "../contexts/AuthContext";
import { saveQuizResult, getQuizResults } from "../../api/quizApi";

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

export function QuizSection({ topic: activeVideoTopic, scriptSlides: activeVideoSlides, language }: QuizSectionProps) {
    const { recentVideos, videoData, setVideoData } = useVideo();
    const { user, session } = useAuth();
    const currentUserId = user?.id || null;
    const token = session?.access_token || '';

    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const ensureAbsoluteUrl = (url: string) => {
        if (!url) return '';
        let cleanUrl = url;
        if (cleanUrl.startsWith('http://localhost:5173')) {
            cleanUrl = cleanUrl.replace('http://localhost:5173', '');
        }
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
            return cleanUrl;
        }
        const cleanPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
        const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
        return `${base}${cleanPath}`;
    };

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
    const [submittedQuestions, setSubmittedQuestions] = useState<boolean[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [backendVideos, setBackendVideos] = useState<any[]>([]);
    const [videosLoading, setVideosLoading] = useState(false);

    // Fetch completed backend videos
    useEffect(() => {
        setVideosLoading(true);
        apiClient.get('/video/list')
            .then((res) => {
                if (res.data?.videos) setBackendVideos(res.data.videos);
                setVideosLoading(false);
            })
            .catch(() => {
                setVideosLoading(false);
            });
    }, []);

    // Fetch quiz history on mount & when a quiz is completed
    useEffect(() => {
        setHistoryLoading(true);
        getQuizResults()
            .then((data) => {
                setHistory(data);
                setHistoryLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load quiz results:", err);
                setHistoryLoading(false);
            });
    }, [quizCompleted, videoData.quiz]);

    // Construct combined generatedVideos array (identical to DashboardPage.tsx)
    const backendMapped = backendVideos.map((v, index) => {
        const hasLocalCopy = v.finalVideo && v.finalVideo.startsWith('/generated');
        const isDriveVideo = v.driveUploaded && v.driveFileId;
        
        const finalVideoPath = hasLocalCopy
            ? v.finalVideo
            : isDriveVideo
                ? `/api/google-drive/stream/${v.driveFileId}?token=${token}`
                : v.finalVideo;

        return {
            id: `backend-${v.jobId || index}`,
            title: v.topic || 'Untitled Video',
            duration: v.isFullCourse ? `Part ${v.part}` : '15 min',
            date: new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            views: 'New',
            videoUrl: ensureAbsoluteUrl(finalVideoPath),
            driveFileUrl: v.driveFileUrl || null,
            driveUploaded: v.driveUploaded || false,
            topic: v.topic || 'Untitled Video',
            jobId: v.jobId,
            createdAt: v.createdAt,
            mode: v.mode,
            isFullCourse: v.isFullCourse,
            part: v.part,
            scriptSlides: v.scriptSlides
        };
    });

    const backendJobIds = new Set(backendVideos.map((v) => v.jobId));
    const localOnlyMapped = recentVideos
        .filter((v) => !!v.videoUrl && !backendJobIds.has(v.jobId as string) && (v.userId === currentUserId || (!v.userId && !currentUserId)))
        .map((v, index) => {
            const hasLocalCopy = v.videoUrl && v.videoUrl.includes('/generated');
            const isDriveVideo = v.driveUploaded && v.driveFileId;
            
            const finalUrl = hasLocalCopy
                ? v.videoUrl
                : isDriveVideo
                    ? `/api/google-drive/stream/${v.driveFileId}?token=${token}`
                    : v.videoUrl;

            return {
                id: `local-${index}`,
                title: v.topic || 'Untitled Video',
                duration: v.isFullCourse ? `Part ${v.currentPart}` : '15 min',
                date: new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                views: 'New',
                videoUrl: ensureAbsoluteUrl(finalUrl),
                driveFileUrl: v.driveFileUrl || null,
                driveUploaded: v.driveUploaded || false,
                topic: v.topic || 'Untitled Video',
                jobId: v.jobId,
                createdAt: v.timestamp,
                mode: v.isFullCourse ? 'FULL' : 'CRASH',
                isFullCourse: v.isFullCourse,
                part: v.currentPart,
                scriptSlides: v.scriptSlides,
            };
        });

    const generatedVideos = [...backendMapped, ...localOnlyMapped];

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

    /* ---------------- GENERATE / SHOW QUIZ FOR SELECTED VIDEO ---------------- */
    const handleStartQuizForVideo = async (video: any) => {
        setIsGenerating(true);
        setError(null);

        const quizJobId = video.jobId;
        const quizTopic = video.topic || video.title;

        try {
            // 1. Try fetching existing quiz by jobId
            const res = await apiClient.get(`/video/quiz/${quizJobId}`);
            if (res.data.quiz_status === "completed" && res.data.questions) {
                setVideoData({
                    quiz: res.data.questions,
                    quizId: quizJobId,
                    showQuiz: true,
                });
                setCurrentQuestionIndex(0);
                setSelectedAnswers(new Array(res.data.questions.length).fill(null));
                setSubmittedQuestions(new Array(res.data.questions.length).fill(false));
                setQuizCompleted(false);
                setIsGenerating(false);
                return;
            }
        } catch (err) {
            console.warn("Failed to fetch existing quiz, attempting generation:", err);
        }

        // 2. Generate on-the-fly if not found
        try {
            const res = await apiClient.post("/quiz/generate", {
                topic: quizTopic,
                scriptSlides: video.scriptSlides || [],
                language: language || 'en',
                questionCount: 10
            });

            setVideoData({
                quiz: res.data.questions,
                quizId: res.data.quizId || quizJobId,
                showQuiz: true
            });

            setCurrentQuestionIndex(0);
            setSelectedAnswers(new Array(res.data.questions.length).fill(null));
            setSubmittedQuestions(new Array(res.data.questions.length).fill(false));
            setQuizCompleted(false);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to generate quiz for this video.");
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

    const handleFinishQuiz = async () => {
        setQuizCompleted(true);
        const finalQuizId = videoData.quizId || videoData.jobId;
        if (finalQuizId) {
            try {
                const quizScore = calculateScore();
                await saveQuizResult(finalQuizId, quizScore, questions.length);
                console.log("✅ Quiz result saved successfully to Supabase");
            } catch (err) {
                console.warn("⚠️ Failed to save quiz result:", err);
            }
        }
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
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Quiz Library Header */}
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
                        <Brain className="w-7 h-7 text-purple-400 animate-pulse" />
                        AI Quiz Library
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Test your comprehension by taking an AI-generated quiz on any of your created videos below.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Video Selection Grid */}
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Choose a Video</h3>
                    
                    {videosLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-[#0d041c]/60 border border-purple-500/25 rounded-2xl">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                            <p className="text-slate-400 text-sm">Loading your video library...</p>
                        </div>
                    ) : generatedVideos.length === 0 ? (
                        <div className="text-center py-12 bg-[#0d041c]/60 border border-purple-500/25 rounded-2xl">
                            <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <h3 className="text-white font-bold text-lg mb-1">No Videos Found</h3>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-5">
                                Generate a video course first to unlock personalized, AI-powered interactive quizzes!
                            </p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {generatedVideos.map((video) => (
                                <div 
                                    key={video.id} 
                                    className="bg-[#0b031a]/60 border border-purple-500/20 rounded-2xl p-5 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300 flex flex-col justify-between"
                                >
                                    <div className="mb-4">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-2">
                                            {video.mode} Course
                                        </span>
                                        <h4 className="text-white font-bold text-base line-clamp-2" title={video.topic}>
                                            {video.topic || video.title}
                                        </h4>
                                        <p className="text-slate-500 text-xs mt-1">
                                            Generated: {video.date}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleStartQuizForVideo(video)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#301979] to-[#6331E8] hover:from-[#3a2091] hover:to-[#733be8] shadow-[0_4px_15px_rgba(48,25,121,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        Take Quiz
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* History Section */}
                <div className="bg-[#0b031a]/60 border border-purple-500/20 rounded-2xl p-8 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        Quiz Attempt History
                    </h3>

                    {historyLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4">
                            No quizzes completed yet. Complete a quiz to view your score history.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-purple-500/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="pb-3 pr-4">Topic</th>
                                        <th className="pb-3 px-4">Date</th>
                                        <th className="pb-3 px-4 text-center">Score</th>
                                        <th className="pb-3 pl-4 text-right">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-purple-500/5">
                                    {history.map((h, i) => (
                                        <tr key={h.id || i} className="text-sm text-slate-300 hover:bg-white/5 transition-colors">
                                            <td className="py-4 pr-4 font-medium text-white truncate max-w-xs">
                                                {h.quizzes?.topic || 'General Quiz'}
                                            </td>
                                            <td className="py-4 px-4 text-slate-400">
                                                {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="py-4 px-4 text-center font-bold text-purple-300">
                                                {h.score} / {h.total_questions} ({h.percentage}%)
                                            </td>
                                            <td className="py-4 pl-4 text-right">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    h.grade === 'A+' || h.grade === 'A' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                    h.grade === 'B' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    h.grade === 'C' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                    {h.grade}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
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
                            setVideoData({ quiz: null, quizId: null, showQuiz: false });
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
                        Quiz Library
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
