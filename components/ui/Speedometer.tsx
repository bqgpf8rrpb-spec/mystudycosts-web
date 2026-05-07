'use client';

import { useEffect, useState } from 'react';

interface SpeedometerProps {
  score: number; // 0-100
  label: string;
  color: string; // 'emerald' | 'yellow' | 'orange' | 'red'
  size?: number; // SVG size in pixels (default: 200)
  showPercentage?: boolean; // Show percentage text (default: true)
}

export default function Speedometer({
  score,
  label,
  color,
  size = 200,
  showPercentage = true,
}: SpeedometerProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount/change
  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const stepDuration = duration / steps;
    const stepSize = score / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newScore = Math.min(score, currentStep * stepSize);
      setAnimatedScore(newScore);

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedScore(score);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [score]);

  // SVG calculations
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35; // Arc radius
  const strokeWidth = size * 0.08; // Arc stroke width

  // Arc path: 180 degrees (from -90deg to +90deg)
  const startAngle = -90; // Left side
  const endAngle = 90; // Right side
  const totalAngle = endAngle - startAngle; // 180 degrees

  // Calculate arc path
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;
  
  const startX = centerX + radius * Math.cos(startAngleRad);
  const startY = centerY + radius * Math.sin(startAngleRad);
  const endX = centerX + radius * Math.cos(endAngleRad);
  const endY = centerY + radius * Math.sin(endAngleRad);

  // Arc path command
  const largeArcFlag = 1; // For 180-degree arc
  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;

  // Calculate arc length for stroke-dasharray
  const arcLength = Math.PI * radius; // Half circle circumference
  const dashArray = arcLength;
  const dashOffset = arcLength - (animatedScore / 100) * arcLength;

  // Needle rotation: map score (0-100) to angle (-90deg to +90deg)
  const needleAngle = startAngle + (animatedScore / 100) * totalAngle;
  const needleAngleRad = (needleAngle * Math.PI) / 180;

  // Needle points (triangle pointing up)
  const needleLength = radius * 0.9;
  const needleBaseWidth = size * 0.04;
  const needleTipX = centerX + needleLength * Math.cos(needleAngleRad);
  const needleTipY = centerY + needleLength * Math.sin(needleAngleRad);

  // Perpendicular direction for needle base
  const perpAngle = needleAngleRad + Math.PI / 2;
  const baseOffsetX = (needleBaseWidth / 2) * Math.cos(perpAngle);
  const baseOffsetY = (needleBaseWidth / 2) * Math.sin(perpAngle);

  const needleBase1X = centerX - baseOffsetX;
  const needleBase1Y = centerY - baseOffsetY;
  const needleBase2X = centerX + baseOffsetX;
  const needleBase2Y = centerY + baseOffsetY;

  const needlePath = `M ${needleTipX} ${needleTipY} L ${needleBase1X} ${needleBase1Y} L ${needleBase2X} ${needleBase2Y} Z`;

  // Color mapping
  const getColorClass = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      emerald: 'text-emerald-400',
      yellow: 'text-yellow-400',
      orange: 'text-orange-400',
      red: 'text-red-400',
    };
    return colorMap[colorName] || 'text-slate-400';
  };

  const getStrokeColor = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      emerald: '#34d399', // emerald-400
      yellow: '#fbbf24', // yellow-400
      orange: '#fb923c', // orange-400
      red: '#f87171', // red-400
    };
    return colorMap[colorName] || '#94a3b8'; // slate-400
  };

  const strokeColor = getStrokeColor(color);
  const textColorClass = getColorClass(color);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.7} // Only show top half
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Background arc (gray) */}
        <path
          d={arcPath}
          fill="none"
          stroke="#334155" // slate-700
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored progress arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          className="transition-all duration-300 ease-out"
        />

        {/* Needle */}
        <path
          d={needlePath}
          fill={strokeColor}
          className="transition-transform duration-300 ease-out"
          style={{
            transformOrigin: `${centerX}px ${centerY}px`,
            transform: `rotate(${needleAngle}deg)`,
          }}
        />

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={size * 0.03}
          fill={strokeColor}
        />
      </svg>

      {/* Label and percentage */}
      <div className="mt-4 text-center">
        {showPercentage && (
          <div className={`text-2xl font-bold ${textColorClass} mb-1`}>
            {Math.round(animatedScore)}%
          </div>
        )}
        <div className="text-sm text-slate-400 font-medium">{label}</div>
      </div>
    </div>
  );
}

