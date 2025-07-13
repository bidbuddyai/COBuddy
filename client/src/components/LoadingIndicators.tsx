import { motion } from "framer-motion";
import { FileText, Brain, CheckCircle, AlertCircle, Loader2, Sparkles, Zap, Target, Wand2, Database, Search, FileCheck, Paperclip } from "lucide-react";

interface ProcessingIndicatorProps {
  stage: 'uploading' | 'analyzing' | 'extracting' | 'matching' | 'complete' | 'error';
  progress?: number;
  fileName?: string;
}

export function DocumentProcessingIndicator({ stage, progress = 0, fileName }: ProcessingIndicatorProps) {
  const stages = {
    uploading: {
      icon: Paperclip,
      text: "Uploading document...",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      playful: "CO Buddy is catching your file!"
    },
    analyzing: {
      icon: Sparkles,
      text: "AI analyzing content...",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      playful: "CO Buddy is reading your document like a detective!"
    },
    extracting: {
      icon: Zap,
      text: "Extracting data...",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      playful: "CO Buddy is finding all the important details!"
    },
    matching: {
      icon: Target,
      text: "Matching rates...",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      playful: "CO Buddy is matching your rates like a pro!"
    },
    complete: {
      icon: CheckCircle,
      text: "Processing complete!",
      color: "text-green-600",
      bgColor: "bg-green-100",
      playful: "CO Buddy has finished! Your document is ready!"
    },
    error: {
      icon: AlertCircle,
      text: "Processing failed",
      color: "text-red-600",
      bgColor: "bg-red-100",
      playful: "CO Buddy encountered an issue, but we'll try again!"
    }
  };

  const currentStage = stages[stage];
  const Icon = currentStage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative"
    >
      <div className="flex items-center space-x-4 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className={`relative ${currentStage.bgColor} p-3 rounded-full`}>
          {stage === 'analyzing' ? (
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Icon className={`h-6 w-6 ${currentStage.color}`} />
            </motion.div>
          ) : stage === 'extracting' ? (
            <motion.div
              animate={{ 
                y: [0, -3, 0],
                rotate: [0, 15, -15, 0]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Icon className={`h-6 w-6 ${currentStage.color}`} />
            </motion.div>
          ) : stage === 'matching' ? (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 1.8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Icon className={`h-6 w-6 ${currentStage.color}`} />
            </motion.div>
          ) : stage === 'uploading' ? (
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                x: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Icon className={`h-6 w-6 ${currentStage.color}`} />
            </motion.div>
          ) : stage === 'complete' ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ 
                duration: 0.6, 
                ease: "easeOut" 
              }}
            >
              <Icon className={`h-6 w-6 ${currentStage.color}`} />
            </motion.div>
          ) : (
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Icon className={`h-6 w-6 ${currentStage.color}`} />
            </motion.div>
          )}
        </div>
        
        <div className="flex-1">
          <p className={`font-medium ${currentStage.color}`}>{currentStage.text}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{currentStage.playful}</p>
          {fileName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{fileName}</p>
          )}
        </div>

        {progress > 0 && stage !== 'complete' && stage !== 'error' && (
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {Math.round(progress)}%
          </div>
        )}
      </div>

      {progress > 0 && stage !== 'complete' && stage !== 'error' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <motion.div
            className={`h-full ${
              stage === 'uploading' ? 'bg-blue-600' :
              stage === 'analyzing' ? 'bg-purple-600' :
              stage === 'extracting' ? 'bg-indigo-600' :
              'bg-orange-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function PulsingDot({ color = "bg-green-500" }: { color?: string }) {
  return (
    <span className="relative inline-flex h-3 w-3">
      <motion.span
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

export function AIThinkingIndicator() {
  return (
    <div className="flex items-center space-x-2">
      <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            className="w-2 h-2 bg-purple-600 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

export function DocumentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse" />
            </div>
          </div>
          
          <motion.div
            animate={{
              x: [-200, 400],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 -skew-x-12 opacity-20"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}