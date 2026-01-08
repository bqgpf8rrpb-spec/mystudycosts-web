'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { 
  shareErasmusComparison, 
  isWebShareAvailable,
  getShareButtonText,
  type ErasmusShareData 
} from '@/lib/share-logic';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareModuleProps {
  homeUniversity?: string;
  homeProgram?: string;
  partnerUniversity?: string;
  partnerCity?: string;
  partnerCountry?: string;
  hasBAfoeg?: boolean;
  monthlySavings?: number; // Net difference in monthly costs
}

export default function ShareModule({
  homeUniversity,
  homeProgram,
  partnerUniversity,
  partnerCity,
  partnerCountry,
  hasBAfoeg = false,
  monthlySavings,
}: ShareModuleProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);

  // Generate social preview text
  const generateShareText = (): string => {
    const city = partnerCity || 'my Erasmus city';
    
    let text = `🚀 I just calculated my semester abroad!`;
    
    if (monthlySavings && monthlySavings > 0) {
      const savings = Math.round(monthlySavings);
      const bafoegText = hasBAfoeg ? ' thanks to Erasmus & BAföG' : ' thanks to Erasmus';
      text += ` In ${city} I save${bafoegText} ${savings}€ per month.`;
    }
    
    text += ` Check your studies on mystudycosts.com`;
    
    return text;
  };

  const handleShare = async () => {
    // Check if we have minimum required data
    if (!homeUniversity || !partnerUniversity) {
      return;
    }

    setIsSharing(true);

    const shareData: ErasmusShareData = {
      homeUniversity,
      homeProgram,
      partnerUniversity,
      partnerCity,
      partnerCountry,
      hasBAfoeg,
    };

    const shareText = generateShareText();
    const shareTitle = 'Erasmus Cost Comparison';

    try {
      const success = await shareErasmusComparison(
        shareData,
        shareTitle,
        shareText
      );

      // If Web Share API is not available (desktop), show feedback
      if (!isWebShareAvailable() && success) {
        setShowCopiedFeedback(true);
        setTimeout(() => {
          setShowCopiedFeedback(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // Don't render if we don't have the required data
  if (!homeUniversity || !partnerUniversity) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-slate-800 relative">
      <div className="flex items-center justify-center">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-full flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
        >
          <Share2 className={`w-5 h-5 ${isSharing ? 'animate-pulse' : ''}`} />
          <span>{isSharing ? 'Sharing...' : getShareButtonText()}</span>
        </button>
      </div>

      {/* Feedback Toast/Badge */}
      <AnimatePresence>
        {showCopiedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2"
          >
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/30">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Link copied!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

