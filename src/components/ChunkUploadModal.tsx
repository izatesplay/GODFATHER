import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Pause, Play, CheckCircle, AlertTriangle, ShieldCheck, File, HardDrive } from 'lucide-react';

interface ChunkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
  onUploadSuccess: (filename: string, size: string) => void;
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const ChunkUploadModal: React.FC<ChunkUploadModalProps> = ({
  isOpen,
  onClose,
  isPremium,
  onUploadSuccess
}) => {
  const [fileMode, setFileMode] = useState<'device' | 'test_preset'>('device');
  const [selectedFileName, setSelectedFileName] = useState('انتخاب نشده');
  const [selectedSizeBytes, setSelectedSizeBytes] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(8);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsUploading(false);
      setIsPaused(false);
      setUploadError(null);
    }
  }, [isOpen]);

  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setSelectedSizeBytes(file.size);
      const calculatedChunks = Math.max(4, Math.min(24, Math.ceil(file.size / (1024 * 1024 * 50))));
      setTotalChunks(calculatedChunks);
      setCurrentChunk(0);
      setProgress(0);
      setUploadError(null);
    }
  };

  const handleSelectPreset = (name: string, sizeBytes: number) => {
    setSelectedFileName(name);
    setSelectedSizeBytes(sizeBytes);
    const calculatedChunks = Math.ceil(sizeBytes / (1024 * 1024 * 200));
    setTotalChunks(calculatedChunks);
    setCurrentChunk(0);
    setProgress(0);
    setUploadError(null);
  };

  // Simulated chunk uploader loop
  useEffect(() => {
    if (!isUploading || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsUploading(false);
          onUploadSuccess(selectedFileName, formatBytes(selectedSizeBytes));
          return 100;
        }
        const step = 100 / totalChunks;
        const next = Math.min(100, Math.round(prev + step));
        setCurrentChunk((c) => Math.min(totalChunks, c + 1));
        return next;
      });
    }, 450);

    return () => clearInterval(timer);
  }, [isUploading, isPaused, totalChunks, selectedFileName, selectedSizeBytes, onUploadSuccess]);

  if (!isOpen) return null;

  const handleStartUpload = () => {
    if (selectedSizeBytes === 0) {
      setUploadError('لطفاً ابتدا یک فایل از حافظه گوشی انتخاب کنید.');
      return;
    }

    setUploadError(null);
    const maxLimit = isPremium ? 4 * 1024 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
    if (selectedSizeBytes > maxLimit) {
      setUploadError(
        `خطای سقف آپلود: حجم فایل (${formatBytes(selectedSizeBytes)}) بیش از حد مجاز است. سقف شما ${isPremium ? '۴ گیگابایت' : '۲ گیگابایت (رایگان)'} است.`
      );
      return;
    }

    setCurrentChunk(0);
    setProgress(0);
    setIsUploading(true);
    setIsPaused(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFileSelect}
        className="hidden"
      />

      <div className="bg-[#1e293b] border-0 sm:border border-slate-700/80 rounded-none sm:rounded-2xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-700/60 bg-[#0f172a]/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">آپلود ابری قطعه‌بندی‌شده (Chunked TUS)</h3>
              <p className="text-[11px] text-slate-400">
                سقف آپلود: {isPremium ? '۴ گیگابایت (GODFATHER Premium)' : '۲ گیگابایت (حساب عادی)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Select File from Phone */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">انتخاب فایل از گوشی یا سیستم:</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>مرور فایل‌های حافظه</span>
              </button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 transition-colors cursor-pointer flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate font-mono">
                  {selectedFileName}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  حجم: {selectedSizeBytes > 0 ? formatBytes(selectedSizeBytes) : 'فایلی انتخاب نشده است (کلیک کنید)'}
                </div>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400">یا انتخاب فایل شبیه‌سازی تست:</span>
              <button
                type="button"
                onClick={() => handleSelectPreset('GODFATHER_Archive_1.8GB.zip', 1.8 * 1024 * 1024 * 1024)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 font-mono transition-colors cursor-pointer"
              >
                1.8 GB (مجاز عادی)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('ScyllaDB_Snapshot_3.6GB.raw', 3.6 * 1024 * 1024 * 1024)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-mono transition-colors cursor-pointer"
              >
                3.6 GB (پریمیوم)
              </button>
            </div>
          </div>

          {/* Progress Bar & Chunks Indicator */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">وضعیت آپلود چندمرحله‌ای:</span>
              <span className="font-mono text-cyan-400 font-bold">{progress}%</span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>چانک {currentChunk} از {totalChunks}</span>
              <span>پروتکل: TUS 1.0 Resumable</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-700/60 bg-[#0f172a]/60 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400">
            {isUploading ? (
              <span className="text-cyan-400 animate-pulse">در حال انتقال قطعات به سرور ابری...</span>
            ) : progress === 100 ? (
              <span className="text-emerald-400 font-bold">آپلود با موفقیت تکمیل شد!</span>
            ) : (
              <span>آماده شروع ارسال</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isUploading && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isPaused ? 'ادامه' : 'توقف'}</span>
              </button>
            )}

            {!isUploading && progress < 100 && (
              <button
                onClick={handleStartUpload}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>شروع آپلود</span>
              </button>
            )}

            {progress === 100 && (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                بستن
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
