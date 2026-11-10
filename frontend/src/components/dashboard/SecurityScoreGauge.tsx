import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface Props {
  score: number;
}

export function SecurityScoreGauge({ score }: Props) {
  const getBadgeColor = (val: number) => {
    if (val >= 85) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (val >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  };

  const getStatusText = (val: number) => {
    if (val >= 85) return "Hardened / Secure";
    if (val >= 60) return "Moderate Vulnerabilities";
    return "Critical Risks Detected";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">Security Posture Score</h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(
            score
          )}`}
        >
          {getStatusText(score)}
        </span>
      </div>

      <div className="flex items-center space-x-6 my-2">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              className="text-slate-800"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              className={score >= 85 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500"}
              strokeWidth="10"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * score) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-extrabold text-white">{score}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Algorithm Factors:</span>
            <ul className="mt-1 space-y-1 text-slate-400">
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Risky Open Ports (Telnet, FTP, SMBv1)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>ARP Spoofing & Rogue DHCP Protection</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Device Hygiene & Classification</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
