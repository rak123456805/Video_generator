import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Play,
  Download // Added Download icon
} from "lucide-react";
import apiClient from "../../api/client";

interface GenerateVideoSectionProps {
  isGenerating?: boolean;
}

export function GenerateVideoSection({}: GenerateVideoSectionProps) {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState("15");
  const [language, setLanguage] = useState("en");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [currentPart, setCurrentPart] = useState(1);
  const [hasNextPart, setHasNextPart] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  
  // ✅ FIXED: Added missing state variable
  const [isFullCourse, setIsFullCourse] = useState(false);

  const backendDuration = duration === "1" ? "1hr" : `${duration}min`;
  const BASE_URL = "http://localhost:5000";

  /* ---------------- HELPERS ---------------- */
  const buildVideoUrl = (finalVideoPath: string) => {
    if (!finalVideoPath) return null;
    return `${BASE_URL}${finalVideoPath}`;
  };

  /* ---------------- INITIAL ANALYZE ---------------- */
  const handleGenerate = async () => {
    if (!text.trim()) return;

    setVideoUrl(null);
    setShowSuggestion(false);
    setHasNextPart(false);
    setIsFullCourse(false); // Reset on new generate
    setCurrentPart(1);
    setProgressStep("Analyzing topic and structuring course...");

    try {
      const response = await apiClient.post("/video/analyze", {
        topic: text,
        duration: backendDuration,
      });

      const analysisData = response.data.analysis;

      if (analysisData.isLargeTopic && duration !== "1") {
        setProgressStep(null);
        setShowSuggestion(true);
      } else {
        await generateCrashCourse();
      }
    } catch (error) {
      console.error(error);
      setProgressStep("Analysis failed. Please check backend connection.");
    }
  };

  /* ---------------- CRASH COURSE ---------------- */
  const generateCrashCourse = async () => {
    try {
      setShowSuggestion(false);
      setIsFullCourse(false);
      setProgressStep("Generating assets & AI Voiceover...");

      const response = await apiClient.post("/video/crash-course", {
        topic: text,
        duration: backendDuration,
        language, 
      });

      setVideoUrl(buildVideoUrl(response.data.finalVideo));
      setProgressStep(null);
    } catch (error) {
      console.error(error);
      setProgressStep("Generation failed. Try a shorter topic.");
    }
  };

  /* ---------------- FULL COURSE ---------------- */
  const generateFullCourse = async () => {
    try {
      setShowSuggestion(false);
      setIsFullCourse(true); // ✅ Now correctly updates state
      setCurrentPart(1);
      setProgressStep("Generating Part 1 (Comprehensive)...");

      const response = await apiClient.post("/video/full-course/part", {
        topic: text,
        part: 1,
        duration: backendDuration,
        language,
      });

      setVideoUrl(buildVideoUrl(response.data.finalVideo));
      setHasNextPart(response.data.hasNextPart);
      setProgressStep(null);
    } catch (error) {
      console.error(error);
      setProgressStep("Failed to generate Full Course");
    }
  };

  /* ---------------- NEXT PART ---------------- */
  const generateNextPart = async () => {
    try {
      const nextPart = currentPart + 1;
      setVideoUrl(null);
      setProgressStep(`Preparing Part ${nextPart}...`);

      const response = await apiClient.post("/video/full-course/part", {
        topic: text,
        part: nextPart,
        duration: backendDuration,
        language,
      });

      setVideoUrl(buildVideoUrl(response.data.finalVideo));
      setCurrentPart(nextPart);
      setHasNextPart(response.data.hasNextPart);
      setProgressStep(null);
    } catch (error) {
      console.error(error);
      setProgressStep("Failed to load next part");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-all">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">AI Instructor</h3>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!progressStep}
        placeholder="Topic (e.g. CSS Box Model)"
        className="w-full h-32 px-5 py-4 rounded-xl border-2 border-gray-100 focus:border-purple-500 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white resize-none transition-all outline-none"
      />

      {/* Duration Selector */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {["15", "30", "1"].map((mins) => (
          <button
            key={mins}
            disabled={!!progressStep}
            onClick={() => setDuration(mins)}
            className={`py-3 rounded-xl border-2 font-medium transition-all ${
              duration === mins
                ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"
            }`}
          >
            {mins === "1" ? "1 Hour" : `${mins} Minutes`}
          </button>
        ))}
      </div>

      {/* Language Selector */}
      <div className="mt-6">
        <label className="text-sm font-semibold text-gray-500 mb-2 block">Instruction Language</label>
        <select
          value={language}
          disabled={!!progressStep}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:border-purple-500"
        >
          <option value="en">English (India)</option>
          <option value="hi">Hindi</option>
          <option value="kn">Kannada</option>
          <option value="ta">Tamil</option>
          <option value="te">Telugu</option>
          <option value="ml">Malayalam</option>
          <option value="bn">Bengali</option>
          <option value="mr">Marathi</option>
        </select>
      </div>

      {progressStep && (
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-center gap-4 text-blue-700 dark:text-blue-300">
          <Loader2 className="animate-spin w-5 h-5" />
          <span className="font-medium">{progressStep}</span>
        </div>
      )}

      {showSuggestion && (
        <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
          <h4 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
             This is a large topic!
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
            Should we create a quick Crash Course or a detailed Multipart Full Course?
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={generateCrashCourse} className="px-4 py-2 bg-white dark:bg-gray-800 border border-amber-300 rounded-lg text-sm font-bold">Crash Course</button>
            <button onClick={generateFullCourse} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold">Full Course</button>
          </div>
        </div>
      )}

      {!progressStep && !showSuggestion && !videoUrl && (
        <button
          onClick={handleGenerate}
          className="mt-8 w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          Generate AI Lesson
        </button>
      )}

      {videoUrl && (
        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Lesson Ready
            </h4>
            {isFullCourse && <span className="text-sm font-medium text-gray-500">Part {currentPart}</span>}
          </div>
          <div className="overflow-hidden rounded-2xl border-4 border-gray-100 dark:border-gray-700 shadow-2xl relative group">
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              autoPlay
              className="w-full bg-black aspect-video"
            />
            {/* Download Overlay Button */}
            <a 
              href={videoUrl} 
              download 
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download Lesson"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
          
          <button 
             onClick={() => {setVideoUrl(null); setText("");}}
             className="text-sm text-purple-600 font-semibold hover:underline"
          >
            Create another video
          </button>
        </div>
      )}

      {hasNextPart && !progressStep && (
        <button
          onClick={generateNextPart}
          className="mt-6 w-full py-4 bg-gray-900 dark:bg-white dark:text-black text-white rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-gray-800 transition-all"
        >
          Watch Part {currentPart + 1}
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}