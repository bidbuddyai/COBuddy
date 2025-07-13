import { motion } from "framer-motion";
import { Sparkles, Zap, FileText, Brain, Database, CheckCircle, AlertCircle } from "lucide-react";
import COBuddyIcon from "@assets/icon_1752387185212.png";

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  icon: React.ComponentType<any>;
}

interface PlayfulLoadingProps {
  stage: 'uploading' | 'analyzing' | 'extracting' | 'matching' | 'complete' | 'error';
  message?: string;
  showParticles?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayfulLoadingAnimation({ 
  stage, 
  message, 
  showParticles = true, 
  size = 'md' 
}: PlayfulLoadingProps) {
  const particles: FloatingParticle[] = [
    { id: 1, x: 10, y: 20, size: 12, color: "#3B82F6", icon: FileText },
    { id: 2, x: 80, y: 15, size: 8, color: "#8B5CF6", icon: Brain },
    { id: 3, x: 60, y: 70, size: 10, color: "#F59E0B", icon: Database },
    { id: 4, x: 20, y: 60, size: 14, color: "#10B981", icon: Sparkles },
    { id: 5, x: 90, y: 50, size: 6, color: "#EF4444", icon: Zap },
  ];

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  const stageAnimations = {
    uploading: {
      rotate: [0, 360],
      scale: [1, 1.1, 1],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
    analyzing: {
      rotate: [0, 15, -15, 0],
      scale: [1, 1.2, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
    },
    extracting: {
      y: [0, -8, 0],
      rotate: [0, 180, 360],
      transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
    },
    matching: {
      scale: [1, 1.3, 1],
      rotate: [0, 360],
      transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
    },
    complete: {
      scale: [0, 1.5, 1],
      rotate: [0, 360],
      transition: { duration: 0.8, ease: "easeOut" }
    },
    error: {
      x: [0, -5, 5, 0],
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-8">
      {/* Floating Particles */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                color: particle.color,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, 10, -10, 0],
                rotate: [0, 360],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            >
              <particle.icon size={particle.size} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Main CO Buddy Icon */}
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-2xl overflow-hidden mb-6`}
        animate={stageAnimations[stage]}
      >
        <img
          src={COBuddyIcon}
          alt="CO Buddy AI"
          className="w-full h-full object-cover"
        />
        
        {/* Pulsing Ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-4 border-[#03512A]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Sparkle Effect for Success */}
        {stage === 'complete' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
            {message}
          </p>
        </motion.div>
      )}

      {/* Bouncing Dots */}
      {stage !== 'complete' && stage !== 'error' && (
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-[#03512A] rounded-full"
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function COBuddyThinkingAnimation() {
  return (
    <div className="flex items-center space-x-2">
      <motion.img
        src={COBuddyIcon}
        alt="CO Buddy AI"
        className="w-8 h-8 rounded-lg"
        animate={{
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-[#03512A] rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        CO Buddy is thinking...
      </span>
    </div>
  );
}

export function DataProcessingWave() {
  return (
    <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

export function PulsingCOBuddy({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} rounded-xl overflow-hidden`}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img
          src={COBuddyIcon}
          alt="CO Buddy AI"
          className="w-full h-full object-cover"
        />
      </motion.div>
      
      {/* Pulsing Ring */}
      <motion.div
        className={`absolute ${sizeClasses[size]} rounded-xl border-2 border-[#03512A]`}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.7, 0.3, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}