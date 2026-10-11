import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Trash2, 
  SwitchCamera, 
  Camera, 
  Video, 
  Check, 
  AlertCircle,
  Sparkles,
  StopCircle
} from 'lucide-react';

interface RoundVideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVideoNote: (videoDataUrl: string, durationSeconds: number) => void;
}

export const RoundVideoRecorderModal: React.FC<RoundVideoRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendVideoNote
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopAllMedia();
      return;
    }

    startCamera(facingMode);

    return () => {
      stopAllMedia();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (facing: 'user' | 'environment') => {
    setError(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    setRecordSeconds(0);

    try {
      // Stop old stream if any
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 480 },
          height: { ideal: 480 },
          aspectRatio: 1
        },
        audio: true
      });

      setStream(mediaStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setError('دسترسی به دوربین یا میکروفون تایید نشد. لطفاً در مرورگر اجازه دسترسی را صادر فرمایید.');
    }
  };

  const stopAllMedia = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setRecordSeconds(0);
    setError(null);

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Record start error:', err);
      setError('خطا در شروع ضبط ویدیو: ' + (err.message || 'مشکل فرمت مدیا'));
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    if (!recordedBlob) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSendVideoNote(reader.result, recordSeconds || 5);
        onClose();
      }
    };
    reader.readAsDataURL(recordedBlob);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#1e293b] border border-cyan-500/50 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Video className="w-4 h-4 text-cyan-400" />
            <span>پیام ویدیویی گرد (Video Note)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-2 text-xs text-red-300">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p>{error}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-white rounded-xl border border-red-500/40 text-xs font-bold cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            {/* Round 1:1 Camera Viewfinder Container */}
            <div className="relative w-60 h-60 rounded-full overflow-hidden border-4 border-cyan-400 shadow-2xl shadow-cyan-500/30 bg-black flex items-center justify-center">
              {recordedUrl ? (
                /* Recorded Preview */
                <video
                  src={recordedUrl}
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Live Camera Stream */
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}

              {/* Recording Animated Ring */}
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse pointer-events-none" />
              )}

              {/* Timer badge */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 border border-slate-700 backdrop-blur-sm text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-cyan-400'}`} />
                <span>
                  0:{recordSeconds.toString().padStart(2, '0')} / 1:00
                </span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-center gap-4 mt-5 w-full">
              {!recordedBlob ? (
                <>
                  {/* Flip camera */}
                  <button
                    onClick={toggleCamera}
                    disabled={isRecording}
                    className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all cursor-pointer"
                    title="تغییر دوربین جلو / عقب"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>

                  {/* Start / Stop Record */}
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-500/30 cursor-pointer transition-all hover:scale-105"
                    >
                      <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                      <span>شروع ضبط</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-500/40 cursor-pointer animate-pulse"
                    >
                      <StopCircle className="w-5 h-5" />
                      <span>توقف ضبط</span>
                    </button>
                  )}

                  {/* Cancel */}
                  <button
                    onClick={onClose}
                    className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="انصراف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              ) : (
                /* Review recorded video */
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => {
                      setRecordedBlob(null);
                      setRecordedUrl(null);
                      setRecordSeconds(0);
                      startCamera(facingMode);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>ضبط مجدد</span>
                  </button>

                  <button
                    onClick={handleSend}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال پیام ویدیویی</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center">
          پیام‌های ویدیویی گرد در چت‌ها به صورت دایره‌ای با امکان قطع و وصل صدا پخش می‌شوند.
        </p>
      </div>
    </div>
  );
};
