import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VideoData {
    videoUrl: string | null;
    topic: string;
    language: string;
    scriptSlides: any[];
    currentPart: number;
    hasNextPart: boolean;
    isFullCourse: boolean;
    timestamp: number;

    // Generation state
    isGenerating: boolean;
    progressStep: string | null;
    showSuggestion: boolean;
    generationStartTime: number | null;

    // Job tracking
    jobId: string | null;

    // Per-component statuses
    textStatus: string | null;
    quizStatus: string | null;
    slideStatus: string | null;
    audioStatus: string | null;
    videoStatus: string | null;

    // Quiz state
    quiz: any[] | null;
    showQuiz: boolean;
}

interface VideoContextType {
    videoData: VideoData;
    setVideoData: (data: Partial<VideoData>) => void;
    clearVideoData: () => void;
    recentVideos: VideoData[];
    addToRecentVideos: (video: VideoData) => void;
}

const defaultVideoData: VideoData = {
    videoUrl: null,
    topic: '',
    language: 'en',
    scriptSlides: [],
    currentPart: 1,
    hasNextPart: false,
    isFullCourse: false,
    timestamp: 0,
    isGenerating: false,
    progressStep: null,
    showSuggestion: false,
    generationStartTime: null,
    jobId: null,
    textStatus: null,
    quizStatus: null,
    slideStatus: null,
    audioStatus: null,
    videoStatus: null,
    quiz: null,
    showQuiz: false,
};

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
    const [videoData, setVideoDataState] = useState<VideoData>(() => {
        // Load from localStorage on mount
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('currentVideo');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse saved video data:', e);
                }
            }
        }
        return defaultVideoData;
    });

    const [recentVideos, setRecentVideos] = useState<VideoData[]>(() => {
        // Load recent videos from localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('recentVideos');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse recent videos:', e);
                }
            }
        }
        return [];
    });

    // Save to localStorage whenever videoData changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('currentVideo', JSON.stringify(videoData));
        }
    }, [videoData]);

    // Save recent videos to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('recentVideos', JSON.stringify(recentVideos));
        }
    }, [recentVideos]);

    const setVideoData = (data: Partial<VideoData>) => {
        setVideoDataState((prev) => {
            if (!prev) return { ...defaultVideoData, ...data };
            const updated = { ...prev, ...data, timestamp: Date.now() };
            // Save to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('currentVideo', JSON.stringify(updated));
            }
            return updated;
        });
    };

    const clearVideoData = () => {
        setVideoDataState(defaultVideoData);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentVideo');
        }
    };

    const addToRecentVideos = (video: VideoData) => {
        setRecentVideos((prev) => {
            // Add new video to the beginning, remove duplicates based on topic and timestamp
            const filtered = prev.filter(
                (v) => !(v.topic === video.topic && v.timestamp === video.timestamp)
            );
            // Keep only the last 20 videos
            return [video, ...filtered].slice(0, 20);
        });
    };

    return (
        <VideoContext.Provider
            value={{
                videoData,
                setVideoData,
                clearVideoData,
                recentVideos,
                addToRecentVideos,
            }}
        >
            {children}
        </VideoContext.Provider>
    );
}

export function useVideo() {
    const context = useContext(VideoContext);
    if (context === undefined) {
        throw new Error('useVideo must be used within a VideoProvider');
    }
    return context;
}
