import React from 'react';

const ProgressRing = ({ value, label, color = '#E86C4F' }) => {
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const size = 200;
  const center = size / 2;
  
  return (
    <div className="progress-ring">
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--border)"
          strokeWidth="12"
          fill="none"
          opacity="0.3"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ 
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        />
      </svg>
      <div className="progress-ring-text">
        <div className="progress-ring-value" style={{ color }}>
          {value}%
        </div>
        <div className="progress-ring-label">{label}</div>
      </div>
    </div>
  );
};

export default ProgressRing;

