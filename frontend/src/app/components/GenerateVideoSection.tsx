import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Play,
  Download,
} from "lucide-react";
import apiClient from "../../api/client";

export function GenerateVideoSection() {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState("15");
  const [language, setLanguage] = useState("en");

  const [showSuggestion, setShowSuggestion] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [currentPart, setCurrentPart] = useState(1);
  const [hasNextPart, setHasNextPart] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [isFullCourse, setIsFullCourse] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const backendDuration = duration === "1" ? "1hr" : `${duration}min`;
  const BASE_URL = "http://localhost:5000";

  const buildVideoUrl = (path: string) => `${BASE_URL}${path}`;

  /* ---------------- ANALYZE ---------------- */
  const handleGenerate = async () => {
    if (!text.trim()) return;

    setVideoUrl(null);
    setShowSuggestion(false);
    setHasNextPart(false);
    setIsFullCourse(false);
    setCurrentPart(1);
    setIsGenerating(true);
    setProgressStep("Analyzing topic feasibility...");

    try {
      const res = await apiClient.post("/video/analyze", {
        topic: text,
        duration: backendDuration,
      });

      const analysis = res.data.analysis;

      // ✅ CORE FIX — matches backend
      if (!analysis.feasible) {
        setProgressStep(null);
        setShowSuggestion(true);
        setIsGenerating(false);
      } else {
        await generateCrashCourse();
      }
    } catch (err) {
      console.error(err);
      setProgressStep("Analysis failed. Backend not reachable.");
      setIsGenerating(false);
    }
  };

  /* ---------------- CRASH COURSE ---------------- */
  const generateCrashCourse = async () => {
    try {
      setShowSuggestion(false);
      setIsFullCourse(false);
      setProgressStep("Generating Crash Course...");

      const res = await apiClient.post("/video/crash-course", {
        topic: text,
        duration: backendDuration,
        language,
      });

      setVideoUrl(buildVideoUrl(res.data.finalVideo));
      setProgressStep(null);
      setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setProgressStep("Crash Course generation failed.");
      setIsGenerating(false);
    }
  };

  /* ---------------- FULL COURSE ---------------- */
  const generateFullCourse = async () => {
    try {
      setShowSuggestion(false);
      setIsFullCourse(true);
      setCurrentPart(1);
      setProgressStep("Generating Part 1 of Full Course...");

      const res = await apiClient.post("/video/full-course/part", {
        topic: text,
        duration: backendDuration,
        part: 1,
        language,
      });

      setVideoUrl(buildVideoUrl(res.data.finalVideo));
      setHasNextPart(res.data.hasNextPart);
      setProgressStep(null);
      setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setProgressStep("Full Course generation failed.");
      setIsGenerating(false);
    }
  };

  /* ---------------- NEXT PART ---------------- */
  const generateNextPart = async () => {
    try {
      const nextPart = currentPart + 1;
      setProgressStep(`Generating Part ${nextPart}...`);

      const res = await apiClient.post("/video/full-course/part", {
        topic: text,
        duration: backendDuration,
        part: nextPart,
        language,
      });

      setVideoUrl(buildVideoUrl(res.data.finalVideo));
      setCurrentPart(nextPart);
      setHasNextPart(res.data.hasNextPart);
      setProgressStep(null);
    } catch (err) {
      console.error(err);
      setProgressStep("Next part failed.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h3 className="text-2xl font-bold">AI Instructor</h3>
      </div>

      {/* Updated Text Box */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter topic (e.g. CSS Box Model)"
        className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 
                   focus:border-purple-500 focus:ring-2 focus:ring-purple-300 
                   dark:focus:ring-purple-700 transition-all duration-300
                   bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400
                   resize-none"
      />

      <div className="grid grid-cols-3 gap-3 mt-4">
        {["15", "30", "1"].map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`p-3 rounded-xl transition-all duration-300 ${
              duration === d 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg" 
                : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {d === "1" ? "1 Hour" : `${d} Minutes`}
          </button>
        ))}
      </div>

      {/* Updated Language Bar */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full mt-4 p-3.5 rounded-xl border border-gray-300 dark:border-gray-600
                   focus:border-purple-500 focus:ring-2 focus:ring-purple-300 
                   dark:focus:ring-purple-700 transition-all duration-300
                   bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900
                   text-gray-900 dark:text-white appearance-none cursor-pointer
                   hover:border-purple-400 dark:hover:border-purple-500"
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

      {isGenerating && (
        <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-purple-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-4">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-full"></div>
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Generating Your Video Lesson
            </h4>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
              This may take 10-30 minutes. Please don't close this tab.
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {progressStep}
            </p>
          </div>
        </div>
      )}

      {progressStep && !isGenerating && (
        <div className="mt-6 flex items-center gap-2">
          <Loader2 className="animate-spin" />
          <span>{progressStep}</span>
        </div>
      )}
{showSuggestion && (
  <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 
                  dark:from-yellow-900/20 dark:to-amber-900/20 
                  rounded-xl border-2 border-yellow-200 
                  dark:border-yellow-800/50 shadow-lg">
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
        <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <p className="font-bold text-gray-800 dark:text-yellow-100 text-lg">
        This topic cannot be fully learned in the selected duration.
        <span className="block text-sm font-normal text-gray-600 dark:text-yellow-200/80 mt-1">
          Choose one of the options below:
        </span>
      </p>
    </div>
    
    <div className="flex gap-4">
      <button
        onClick={generateCrashCourse}
        className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 
                   dark:border-gray-600 hover:border-purple-400 
                   dark:hover:border-purple-500 bg-white dark:bg-gray-800
                   text-gray-800 dark:text-white font-medium
                   hover:bg-gray-50 dark:hover:bg-gray-700
                   transition-all duration-300 shadow-md hover:shadow-lg
                   flex items-center justify-center gap-2"
      >
        <span>Crash Course</span>
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={generateFullCourse}
        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 
                   hover:from-amber-600 hover:to-yellow-700 text-white font-medium
                   transition-all duration-300 shadow-lg hover:shadow-xl
                   transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
      >
        <span>Full Course (Part by Part)</span>
        <Play className="w-4 h-4" />
      </button>
    </div>
    
    <p className="text-sm text-gray-600 dark:text-yellow-200/80 mt-4 text-center">
      ⏳ Full Course may take longer but provides comprehensive learning
    </p>
  </div>
)}

      {!isGenerating && !progressStep && !showSuggestion && !videoUrl && (
        <button
          onClick={handleGenerate}
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 
                     hover:from-purple-700 hover:to-indigo-700 text-white p-4 rounded-xl
                     font-semibold text-lg transition-all duration-300
                     shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          <Play className="inline mr-2" />
          Generate Lesson
        </button>
      )}

      {videoUrl && (
        <div className="mt-6">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full rounded-xl shadow-lg"
          />
          {hasNextPart && (
            <button
              onClick={generateNextPart}
              className="mt-4 w-full bg-black text-white p-3 rounded flex justify-center items-center gap-2"
            >
              Next Part <ChevronRight />
            </button>
          )}
        </div>
      )}
    </div>
  );
}