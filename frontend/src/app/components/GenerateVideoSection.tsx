import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Play,
  Download,
  XCircle,
  RotateCcw,
  Brain,
  FileText,
  Image,
  Mic,
  Video,
} from "lucide-react";
import apiClient from "../../api/client";
import { useVideo } from "../contexts/VideoContext";

interface GenerateVideoSectionProps {
  onScriptGenerated?: (topic: string, language: string, scriptSlides: any[]) => void;
}

/* ---------- Step status icon helper ---------- */
function StepIcon({ status }: { status: string | null }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "processing") return <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  return <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
}

function StepLabel({ label, status, icon: Icon }: { label: string; status: string | null; icon: any }) {
  const textColor =
    status === "completed" ? "text-green-600 dark:text-green-400" :
      status === "processing" ? "text-purple-600 dark:text-purple-400 font-semibold" :
        status === "failed" ? "text-red-600 dark:text-red-400" :
          "text-gray-400 dark:text-gray-500";

  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${textColor}`} />
      <span className={`text-sm ${textColor}`}>{label}</span>
      <StepIcon status={status} />
    </div>
  );
}

export function GenerateVideoSection({ onScriptGenerated }: GenerateVideoSectionProps = {}) {
  const { videoData, setVideoData, addToRecentVideos } = useVideo();

  // Local form state
  const [text, setText] = useState(videoData.topic || "");
  const [duration, setDuration] = useState(videoData.isFullCourse ? "1" : "15");
  const [language, setLanguage] = useState(videoData.language || "en");

  // Polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Local sync for form inputs
  useEffect(() => {
    if (videoData.topic && !text) setText(videoData.topic);
    if (videoData.language && language === "en") setLanguage(videoData.language);
  }, [videoData.topic, videoData.language]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const backendDuration = duration === "1" ? "1hr" : `${duration}min`;
  const BASE_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:5000";

  const buildVideoUrl = (path: string) => `${BASE_URL}${path}`;

  /* ---------------- POLLING LOGIC (Per-Component) ---------------- */
  const startPolling = (jobId: string, topicText: string, lang: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/video/status/${jobId}`);
        const {
          status, progress, result, error,
          text_status, quiz_status, slide_status, audio_status, video_status
        } = res.data;

        // Update per-component statuses
        setVideoData({
          progressStep: progress || "Processing...",
          textStatus: text_status,
          quizStatus: quiz_status,
          slideStatus: slide_status,
          audioStatus: audio_status,
          videoStatus: video_status,
        });

        // Progressive data: make quiz + script available as soon as they're ready
        if (result?.quiz && quiz_status === "completed") {
          setVideoData({
            quiz: result.quiz,
            showQuiz: true,
          });
        }
        if (result?.scriptSlides && text_status === "completed") {
          setVideoData({
            scriptSlides: result.scriptSlides,
          });
          if (onScriptGenerated) {
            onScriptGenerated(topicText, lang, result.scriptSlides);
          }
        }

        if (status === "completed" && result) {
          // Stop polling
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          const videoUrl = buildVideoUrl(result.finalVideo);

          setVideoData({
            videoUrl,
            progressStep: null,
            isGenerating: false,
            scriptSlides: result.scriptSlides || videoData.scriptSlides || [],
            quiz: result.quiz || videoData.quiz || null,
            showQuiz: !!(result.quiz || videoData.quiz),
            hasNextPart: result.hasNextPart || false,
            currentPart: result.currentPart || result.part || 1,
            textStatus: "completed",
            quizStatus: quiz_status || "completed",
            slideStatus: "completed",
            audioStatus: "completed",
            videoStatus: "completed",
            timestamp: Date.now(),
          });

          addToRecentVideos({
            ...videoData,
            videoUrl,
            topic: topicText,
            language: lang,
            jobId,
            scriptSlides: result.scriptSlides || videoData.scriptSlides || [],
            quiz: result.quiz || videoData.quiz || null,
            showQuiz: !!(result.quiz || videoData.quiz),
            hasNextPart: result.hasNextPart || false,
            currentPart: result.currentPart || result.part || 1,
            isFullCourse: result.mode === "FULL",
            timestamp: Date.now(),
            isGenerating: false,
            progressStep: null,
            showSuggestion: false,
            generationStartTime: null,
            textStatus: null,
            quizStatus: null,
            slideStatus: null,
            audioStatus: null,
            videoStatus: null,
          });
        } else if (status === "failed") {
          // Stop polling
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          setVideoData({
            progressStep: error || "Video generation failed.",
            isGenerating: false,
          });
          setTimeout(() => setVideoData({ progressStep: null }), 5000);
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Don't stop polling on transient network errors
      }
    }, 3000);
  };

  /* ---------------- STOP GENERATION ---------------- */
  const handleStop = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setVideoData({
      isGenerating: false,
      progressStep: null,
      showSuggestion: false,
      videoUrl: null,
      textStatus: null,
      quizStatus: null,
      slideStatus: null,
      audioStatus: null,
      videoStatus: null,
    });
  };

  /* ---------------- ANALYZE ---------------- */
  const handleGenerate = async () => {
    if (!text.trim()) return;

    setVideoData({
      topic: text,
      language: language,
      videoUrl: null,
      showSuggestion: false,
      hasNextPart: false,
      isFullCourse: false,
      currentPart: 1,
      isGenerating: true,
      progressStep: "Analyzing topic feasibility...",
      generationStartTime: Date.now(),
      jobId: null,
      textStatus: null,
      quizStatus: null,
      slideStatus: null,
      audioStatus: null,
      videoStatus: null,
    });

    try {
      const res = await apiClient.post("/video/analyze", {
        topic: text,
        duration: backendDuration,
      });

      const analysis = res.data.analysis;

      if (!analysis.feasible) {
        setVideoData({
          progressStep: null,
          showSuggestion: true,
          isGenerating: false,
        });
      } else {
        await generateCrashCourse();
      }
    } catch (err) {
      console.error(err);
      setVideoData({
        progressStep: "Analysis failed. Backend not reachable.",
        isGenerating: false,
      });
      setTimeout(() => {
        setVideoData({ progressStep: null });
      }, 5000);
    }
  };

  /* ---------------- CRASH COURSE (ASYNC) ---------------- */
  const generateCrashCourse = async () => {
    try {
      setVideoData({
        showSuggestion: false,
        isFullCourse: false,
        progressStep: "Starting Crash Course generation...",
        isGenerating: true,
      });

      const res = await apiClient.post("/video/crash-course", {
        topic: text,
        duration: backendDuration,
        language,
      });

      if (res.data.jobId) {
        setVideoData({
          jobId: res.data.jobId,
          progressStep: "Processing...",
        });
        startPolling(res.data.jobId, text, language);
      }
    } catch (err: any) {
      console.error(err);
      setVideoData({
        progressStep: err.response?.data?.error || "Crash Course generation failed.",
        isGenerating: false,
      });
      setTimeout(() => {
        setVideoData({ progressStep: null });
      }, 5000);
    }
  };

  /* ---------------- FULL COURSE (ASYNC) ---------------- */
  const generateFullCourse = async () => {
    try {
      setVideoData({
        showSuggestion: false,
        isFullCourse: true,
        currentPart: 1,
        progressStep: "Starting Part 1 of Full Course...",
        isGenerating: true,
      });

      const res = await apiClient.post("/video/full-course/part", {
        topic: text,
        duration: backendDuration,
        part: 1,
        language,
      });

      if (res.data.jobId) {
        setVideoData({
          jobId: res.data.jobId,
          progressStep: "Processing...",
        });
        startPolling(res.data.jobId, text, language);
      }
    } catch (err: any) {
      console.error(err);
      setVideoData({
        progressStep: err.response?.data?.error || "Full Course generation failed.",
        isGenerating: false,
      });
      setTimeout(() => {
        setVideoData({ progressStep: null });
      }, 5000);
    }
  };

  /* ---------------- NEXT PART (ASYNC) ---------------- */
  const generateNextPart = async () => {
    try {
      const nextPart = videoData.currentPart + 1;
      setVideoData({
        progressStep: `Starting Part ${nextPart}...`,
        isGenerating: true,
      });

      const res = await apiClient.post("/video/full-course/part", {
        topic: text,
        duration: backendDuration,
        part: nextPart,
        language,
      });

      if (res.data.jobId) {
        setVideoData({
          jobId: res.data.jobId,
          progressStep: "Processing...",
        });
        startPolling(res.data.jobId, text, language);
      }
    } catch (err: any) {
      console.error(err);
      setVideoData({
        progressStep: "Next part failed.",
        isGenerating: false,
      });
      setTimeout(() => {
        setVideoData({ progressStep: null });
      }, 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AI Instructor</h3>
        </div>
        {videoData.isGenerating && (
          <button
            onClick={handleStop}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" /> Stop
          </button>
        )}
      </div>

      {/* Text Box */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter topic (e.g. CSS Box Model)"
        disabled={videoData.isGenerating}
        className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 
                   focus:border-purple-500 focus:ring-2 focus:ring-purple-300 
                   dark:focus:ring-purple-700 transition-all duration-300
                   bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400
                   resize-none outline-none disabled:opacity-50"
      />

      {/* Duration Select */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {["15", "30", "1"].map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            disabled={videoData.isGenerating}
            className={`p-3 rounded-xl transition-all duration-300 font-medium ${duration === d
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              } disabled:opacity-50`}
          >
            {d === "1" ? "1 Hour" : `${d} Minutes`}
          </button>
        ))}
      </div>

      {/* Language Bar */}
      <div className="relative">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={videoData.isGenerating}
          className="w-full mt-4 p-3.5 rounded-xl border border-gray-300 dark:border-gray-600
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-300 
                     dark:focus:ring-purple-700 transition-all duration-300
                     bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900
                     text-gray-900 dark:text-white appearance-none cursor-pointer
                     hover:border-purple-400 dark:hover:border-purple-500 outline-none
                     disabled:opacity-50"
        >
          <option value="en" className="dark:bg-gray-800">English</option>
          <option value="hi" className="dark:bg-gray-800">Hindi</option>
          <option value="kn" className="dark:bg-gray-800">Kannada</option>
          <option value="ta" className="dark:bg-gray-800">Tamil</option>
          <option value="te" className="dark:bg-gray-800">Telugu</option>
          <option value="ml" className="dark:bg-gray-800">Malayalam</option>
          <option value="bn" className="dark:bg-gray-800">Bengali</option>
          <option value="mr" className="dark:bg-gray-800">Marathi</option>
        </select>
        <ChevronRight className="absolute right-4 top-[calc(50%+8px)] -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none rotate-90" />
      </div>

      {/* Multi-Step Progress Indicator */}
      {videoData.isGenerating && (
        <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-purple-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="relative mb-3">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-full"></div>
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              Generating Your Video Lesson
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
              Content appears progressively as each step completes
            </p>
          </div>

          {/* Per-component status grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <StepLabel label="Text" status={videoData.textStatus} icon={FileText} />
            <StepLabel label="Quiz" status={videoData.quizStatus} icon={Brain} />
            <StepLabel label="Slides" status={videoData.slideStatus} icon={Image} />
            <StepLabel label="Audio" status={videoData.audioStatus} icon={Mic} />
            <StepLabel label="Video" status={videoData.videoStatus} icon={Video} />
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(10, (
                  [videoData.textStatus, videoData.quizStatus, videoData.slideStatus, videoData.audioStatus, videoData.videoStatus]
                    .filter(s => s === "completed").length / 5
                ) * 100)}%`
              }}
            ></div>
          </div>

          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 text-center">
            {videoData.progressStep}
          </p>
        </div>
      )}

      {videoData.progressStep && !videoData.isGenerating && (
        <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${videoData.progressStep.toLowerCase().includes('failed')
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
          {videoData.progressStep.toLowerCase().includes('failed') ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          )}
          <span className="font-medium">{videoData.progressStep}</span>
        </div>
      )}

      {videoData.showSuggestion && (
        <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 
                  dark:from-yellow-900/20 dark:to-amber-900/20 
                  rounded-xl border-2 border-yellow-200 
                  dark:border-yellow-800/50 shadow-lg">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-yellow-100 text-lg">
                Complex Topic Detected
              </p>
              <p className="text-sm text-gray-600 dark:text-yellow-200/80 mt-1">
                This topic is quite deep for the selected duration. Choose how you'd like to proceed:
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={generateCrashCourse}
              className="flex-1 px-6 py-4 rounded-xl border-2 border-white dark:border-gray-700
                   hover:border-purple-400 dark:hover:border-purple-500 bg-white/80 dark:bg-gray-800/80
                   text-gray-800 dark:text-white font-semibold
                   transition-all duration-300 shadow-sm hover:shadow-md
                   flex items-center justify-center gap-2"
            >
              <span>Quick Crash Course</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={generateFullCourse}
              className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 
                   hover:from-amber-600 hover:to-yellow-700 text-white font-bold
                   transition-all duration-300 shadow-md hover:shadow-lg
                   transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Full Course (Part by Part)</span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>

          <p className="text-sm text-amber-700 dark:text-amber-400/80 mt-4 text-center font-medium">
            ⏳ Full Course provides deeper explanations through multiple lessons
          </p>
        </div>
      )}

      {!videoData.isGenerating && !videoData.progressStep && !videoData.showSuggestion && !videoData.videoUrl && (
        <button
          onClick={handleGenerate}
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 
                     hover:from-purple-700 hover:to-indigo-700 text-white p-4 rounded-xl
                     font-bold text-lg transition-all duration-300
                     shadow-lg hover:shadow-xl transform hover:-translate-y-1
                     active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          Generate Lesson
        </button>
      )}

      {videoData.videoUrl && !videoData.isGenerating && (
        <div className="mt-8 space-y-6">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800 relative group">
            <video
              src={videoData.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {videoData.hasNextPart && (
              <button
                onClick={generateNextPart}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black font-bold p-4 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95"
              >
                <span>Generate Next Part</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => window.open(videoData.videoUrl || "", "_blank")}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold p-4 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-md"
            >
              <Download className="w-5 h-5" /> Download Lesson
            </button>

            <button
              onClick={() => setVideoData({ videoUrl: null, showSuggestion: false, isGenerating: false, jobId: null })}
              className="sm:w-16 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex justify-center items-center hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-all"
              title="Create New"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
