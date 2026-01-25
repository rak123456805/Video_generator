import { useEffect, useState } from 'react';
import { CircleCheck, Loader, XCircle } from 'lucide-react';

interface VideoGenerationStatusProps {
  onComplete: () => void;
  onStop?: () => void;
}

export function VideoGenerationStatus({ onComplete, onStop }: VideoGenerationStatusProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStopped, setIsStopped] = useState(false);

  const steps = [
    { label: 'Analyzing content...', duration: 2000 },
    { label: 'Generating script...', duration: 3000 },
    { label: 'Creating visuals...', duration: 3000 },
    { label: 'Adding narration...', duration: 2500 },
    { label: 'Rendering video...', duration: 2500 },
    { label: 'Finalizing...', duration: 2000 },
  ];

  useEffect(() => {
    if (isStopped) return;

    if (currentStep < steps.length) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, steps[currentStep].duration);
      return () => clearTimeout(timer);
    } else {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(completeTimer);
    }
  }, [currentStep, steps, onComplete, isStopped]);

  const handleStop = () => {
    setIsStopped(true);
    if (onStop) {
      onStop();
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl text-gray-900 dark:text-white">
          Video Generation Progress
        </h3>
        {!isStopped && currentStep < steps.length && onStop && (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Stop Generation</span>
          </button>
        )}
      </div>

      {isStopped ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
          <XCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-3" />
          <p className="text-red-700 dark:text-red-300 font-medium">
            Video generation stopped
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            The generation process has been cancelled
          </p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-right">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isPending = index > currentStep;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 ${isPending ? 'opacity-40' : 'opacity-100'
                    }`}
                >
                  {isCompleted ? (
                    <CircleCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                  )}
                  <span
                    className={`${isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : isCurrent
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {currentStep >= steps.length && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-center">
                ✓ Video generated successfully!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}