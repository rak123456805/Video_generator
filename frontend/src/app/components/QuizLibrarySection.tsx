import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain, Play, Plus, Sparkles, RefreshCw, Trash2, CheckCircle2,
  Search, BookOpen, Clock, Trophy, ChevronRight, Loader2,
  AlertCircle, Award, ListChecks, HelpCircle, ArrowRight, Video
} from "lucide-react";
import {
  listQuizzes, getQuizResults, getQuizStats, generateQuizApi,
  deleteQuiz, QuizHeader, QuizResult, QuizStats
} from "../../api/quizApi";
import { useVideo } from "../contexts/VideoContext";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../../api/client";

interface QuizLibrarySectionProps {
  onNavigateToQuiz: () => void;
  onNavigateToGenerate?: () => void;
}

export function QuizLibrarySection({ onNavigateToQuiz, onNavigateToGenerate }: QuizLibrarySectionProps) {
  const { videoData, setVideoData, recentVideos } = useVideo();
  const { user } = useAuth();

  const [quizzes, setQuizzes] = useState<QuizHeader[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "completed" | "unattempted">("all");

  // Generating state per quiz
  const [generatingForQuizId, setGeneratingForQuizId] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);

  // New Quiz Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Recently created alert notification
  const [recentlyCreated, setRecentlyCreated] = useState<{ id: string; topic: string; questions: any[] } | null>(null);

  // Backend videos for "from video" generation
  const [backendVideos, setBackendVideos] = useState<any[]>([]);

  // Load quizzes and results
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedQuizzes, fetchedResults, fetchedStats] = await Promise.all([
        listQuizzes().catch(() => []),
        getQuizResults().catch(() => []),
        getQuizStats().catch(() => null),
      ]);
      setQuizzes(fetchedQuizzes);
      setResults(fetchedResults);
      setStats(fetchedStats);
    } catch (err: any) {
      console.error("Failed to load quiz library:", err);
      setError("Failed to load quizzes. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Also load backend videos for optional "from video" tab
    apiClient.get("/video/list")
      .then((res) => {
        if (res.data?.videos) setBackendVideos(res.data.videos);
      })
      .catch(() => {});
  }, []);

  // Map results by quiz_id (take the latest result)
  const resultsByQuizId = new Map<string, QuizResult>();
  results.forEach((r) => {
    if (!resultsByQuizId.has(r.quiz_id)) {
      resultsByQuizId.set(r.quiz_id, r);
    }
  });

  /* ---------------- ACTION: GO TO SAME QUIZ ---------------- */
  const handleGoToQuiz = async (quiz: QuizHeader) => {
    setLoadingQuizId(quiz.id);
    try {
      let questions = quiz.questions;
      // If questions are not already populated on the quiz header, fetch from API
      if (!questions || questions.length === 0) {
        const res = await apiClient.get(`/quiz/${quiz.id}`);
        questions = res.data?.quiz?.questions || [];
      }

      if (!questions || questions.length === 0) {
        // Fallback: check /video/quiz/:id
        const vRes = await apiClient.get(`/video/quiz/${quiz.id}`).catch(() => null);
        if (vRes?.data?.questions) {
          questions = vRes.data.questions;
        }
      }

      if (!questions || questions.length === 0) {
        alert("Could not load questions for this quiz.");
        setLoadingQuizId(null);
        return;
      }

      // Update videoData to point to this quiz
      setVideoData({
        quiz: questions,
        quizId: quiz.id,
        topic: quiz.topic,
        showQuiz: true,
      });

      // Switch to Quiz Mode
      onNavigateToQuiz();
    } catch (err) {
      console.error("Error opening quiz:", err);
      alert("Failed to load this quiz. Please try again.");
    } finally {
      setLoadingQuizId(null);
    }
  };

  /* ---------------- ACTION: GENERATE NEXT QUIZ (10 QUESTIONS) ---------------- */
  const handleGenerateNextQuiz = async (baseQuiz: QuizHeader) => {
    setGeneratingForQuizId(baseQuiz.id);
    setError(null);
    try {
      // Find how many quizzes on this topic already exist to determine next part number
      const cleanTopic = baseQuiz.topic.replace(/(\(Quiz\s+\d+\)|- Quiz\s+\d+|\(Part\s+\d+\)|- Part\s+\d+)/i, "").trim();
      const matchingCount = quizzes.filter(q => q.topic.toLowerCase().includes(cleanTopic.toLowerCase())).length;
      const nextQuizNumber = matchingCount + 1;

      // Extract existing question texts to avoid repeats
      const prevQuestions = baseQuiz.questions || [];

      const result = await generateQuizApi({
        topic: cleanTopic,
        questionCount: 10,
        isNextQuiz: true,
        quizNumber: nextQuizNumber,
        previousQuestions: prevQuestions,
        language: "en",
      });

      if (result.success && result.questions) {
        const newQuizItem: QuizHeader = {
          id: result.quizId,
          topic: result.topic,
          questionCount: result.questions.length,
          questions: result.questions,
          created_at: new Date().toISOString(),
          user_id: user?.id,
        };

        // Prepend new quiz to local state
        setQuizzes((prev) => [newQuizItem, ...prev]);

        // Show banner allowing user to jump in immediately
        setRecentlyCreated({
          id: result.quizId,
          topic: result.topic,
          questions: result.questions,
        });
      }
    } catch (err: any) {
      console.error("Failed to generate next quiz:", err);
      setError(err?.response?.data?.message || "Failed to generate the next 10-question quiz.");
    } finally {
      setGeneratingForQuizId(null);
    }
  };

  /* ---------------- ACTION: CREATE NEW QUIZ FROM SCRATCH ---------------- */
  const handleCreateNewQuiz = async () => {
    if (!newTopic.trim()) return;
    setIsCreatingNew(true);
    setCreateError(null);
    try {
      const result = await generateQuizApi({
        topic: newTopic.trim(),
        language: newLanguage,
        questionCount: 10,
      });

      if (result.success && result.questions) {
        const newQuizItem: QuizHeader = {
          id: result.quizId,
          topic: result.topic,
          questionCount: result.questions.length,
          questions: result.questions,
          created_at: new Date().toISOString(),
          user_id: user?.id,
        };

        setQuizzes((prev) => [newQuizItem, ...prev]);
        setShowCreateModal(false);
        setNewTopic("");

        // Set banner
        setRecentlyCreated({
          id: result.quizId,
          topic: result.topic,
          questions: result.questions,
        });
      }
    } catch (err: any) {
      console.error("Failed to create new quiz:", err);
      setCreateError(err?.response?.data?.message || "Failed to generate quiz.");
    } finally {
      setIsCreatingNew(false);
    }
  };

  /* ---------------- ACTION: DELETE QUIZ ---------------- */
  const handleDeleteQuiz = async (quizId: string, topic: string) => {
    if (!window.confirm(`Are you sure you want to delete the quiz for "${topic}"?`)) return;
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      if (recentlyCreated?.id === quizId) setRecentlyCreated(null);
    } catch (err) {
      console.error("Failed to delete quiz:", err);
      alert("Failed to delete quiz.");
    }
  };

  // Filter & search logic
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch = q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const hasResult = resultsByQuizId.has(q.id);
    if (filterMode === "completed") return hasResult;
    if (filterMode === "unattempted") return !hasResult;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* ── TOP HEADER BANNER ── */}
      <div className="rounded-3xl p-8 bg-gradient-to-r from-[#170838] via-[#23094d] to-[#11042b] border border-purple-500/30 shadow-[0_0_40px_rgba(124,58,237,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/40 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            Dedicated Quiz Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Quiz Library</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Practice and master topics with interactive AI quizzes. Retake any quiz or instantly generate the next 10-question follow-up test!
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#301979] via-[#906AF3] to-[#6331E8] border border-purple-400/50 shadow-[0_0_25px_rgba(144,106,243,0.5)] hover:shadow-[0_0_40px_rgba(144,106,243,0.8)] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Custom Quiz
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={loadData}
            title="Refresh Library"
            className="p-3.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* ── STATS CARDS ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-[#0d041c]/90 border border-purple-500/25 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quizzes</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{quizzes.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Available in library</div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0d041c]/90 border border-purple-500/25 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats ? stats.totalTaken : results.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1">Attempt records</div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0d041c]/90 border border-purple-500/25 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats ? `${stats.avgPercentage}%` : "N/A"}</div>
          <div className="text-[11px] text-slate-500 mt-1">Overall performance</div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0d041c]/90 border border-purple-500/25 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Grade</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats ? stats.avgGrade : "N/A"}</div>
          <div className="text-[11px] text-purple-400 mt-1">Current standing</div>
        </div>
      </div>

      {/* ── RECENTLY CREATED BANNER ── */}
      <AnimatePresence>
        {recentlyCreated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-5 bg-gradient-to-r from-emerald-950/60 to-purple-950/60 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Quiz Ready!</p>
                <p className="text-white font-bold text-sm">
                  10 questions generated for <span className="text-emerald-300">"{recentlyCreated.topic}"</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  setVideoData({
                    quiz: recentlyCreated.questions,
                    quizId: recentlyCreated.id,
                    topic: recentlyCreated.topic,
                    showQuiz: true,
                  });
                  onNavigateToQuiz();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Play Quiz Now
              </button>
              <button
                onClick={() => setRecentlyCreated(null)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR MESSAGE ── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes by topic..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0d041c]/90 border border-purple-500/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0d041c]/90 border border-purple-500/20 self-start sm:self-auto">
          {[
            { id: "all", label: "All Quizzes", count: quizzes.length },
            { id: "completed", label: "Attempted", count: results.length },
            { id: "unattempted", label: "Unattempted", count: Math.max(0, quizzes.length - resultsByQuizId.size) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterMode === tab.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* ── QUIZ GRID ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0d041c]/60 border border-purple-500/20 rounded-3xl">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
          <p className="text-white font-bold text-base">Loading Quiz Library...</p>
          <p className="text-slate-500 text-xs mt-1">Retrieving persistent quizzes from Supabase</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center py-16 px-6 bg-[#0d041c]/60 border border-purple-500/20 rounded-3xl">
          <Brain className="w-16 h-16 text-purple-400/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery ? "No matching quizzes found" : "Your Quiz Library is Ready"}
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            {searchQuery
              ? `No quizzes matching "${searchQuery}". Try a different keyword.`
              : "Create your first interactive 10-question quiz or generate a quiz from any of your completed courses!"}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Generate Quiz (10 Questions)
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz, index) => {
            const result = resultsByQuizId.get(quiz.id);
            const isGeneratingThis = generatingForQuizId === quiz.id;
            const isLoadingThis = loadingQuizId === quiz.id;
            const qCount = quiz.questionCount || (quiz.questions ? quiz.questions.length : 10);
            const dateStr = quiz.created_at
              ? new Date(quiz.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Recent";

            return (
              <motion.div
                key={quiz.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="rounded-3xl p-6 bg-[#0d041c]/90 border border-purple-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Background glow on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div>
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/25">
                      <ListChecks className="w-3.5 h-3.5 text-purple-400" />
                      {qCount} Questions
                    </span>

                    <button
                      onClick={() => handleDeleteQuiz(quiz.id, quiz.topic)}
                      title="Delete quiz"
                      className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors" title={quiz.topic}>
                    {quiz.topic}
                  </h3>

                  {/* Date & Attempts Status */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{dateStr}</span>
                  </div>

                  {/* Attempt Performance Badge */}
                  <div className="mb-6">
                    {result ? (
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-500/15 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs text-slate-300 font-semibold">Last Attempt</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {result.score}/{result.total_questions} ({result.percentage}%)
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                            result.grade === 'A+' || result.grade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            result.grade === 'B' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            result.grade === 'C' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {result.grade}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                        <span>Not attempted yet</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── CARD ACTION BUTTONS ── */}
                <div className="space-y-2 pt-2 border-t border-purple-500/10">
                  {/* Button 1: Go to same quiz */}
                  <button
                    onClick={() => handleGoToQuiz(quiz)}
                    disabled={isLoadingThis || isGeneratingThis}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#301979] to-[#6331E8] hover:from-[#3a2091] hover:to-[#733be8] border border-purple-400/40 shadow-[0_4px_15px_rgba(48,25,121,0.4)] hover:shadow-[0_0_20px_rgba(144,106,243,0.6)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none"
                  >
                    {isLoadingThis ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading Quiz...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {result ? "Retake Quiz" : "Go to Quiz"}
                      </>
                    )}
                  </button>

                  {/* Button 2: Generate next quiz containing 10 questions */}
                  <button
                    onClick={() => handleGenerateNextQuiz(quiz)}
                    disabled={isGeneratingThis || isLoadingThis}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 hover:border-purple-400/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none group/btn"
                  >
                    {isGeneratingThis ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                        <span>Generating Next Quiz (10 Qs)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover/btn:rotate-12 transition-transform" />
                        <span>Generate Next Quiz (10 Qs)</span>
                        <ArrowRight className="w-3 h-3 text-purple-400 group-hover/btn:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── CREATE CUSTOM QUIZ MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl p-7 bg-[#11042b] border border-purple-500/30 shadow-[0_0_50px_rgba(124,58,237,0.3)] space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Create New Quiz</h3>
                    <p className="text-slate-400 text-xs">Generate 10 questions using Gemini AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {createError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Topic / Subject *
                  </label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g., Quantum Computing, World War II, React Hooks..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-purple-500/25 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 transition-colors"
                    disabled={isCreatingNew}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-purple-500/25 text-white text-sm focus:outline-none focus:border-purple-400 transition-colors"
                    disabled={isCreatingNew}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                    <option value="bn">Bengali (বাংলা)</option>
                    <option value="mr">Marathi (मराठी)</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-purple-300 flex items-center gap-2.5">
                  <ListChecks className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>The AI will craft exactly <strong>10 questions</strong> with 4 multiple-choice options and in-depth explanations.</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingNew}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewQuiz}
                  disabled={!newTopic.trim() || isCreatingNew}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingNew ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating (10 Qs)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate Quiz
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
