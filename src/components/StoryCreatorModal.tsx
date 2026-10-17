import React, { useState, useRef } from 'react';
import { X, Sparkles, Clock, Send, Camera, UploadCloud, Film } from 'lucide-react';
import { Story } from '../types/telegram';

interface StoryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (newStory: Partial<Story>) => void;
  isPremium: boolean;
}

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  isPremium
}) => {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [stealthMode, setStealthMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video');
      setMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedMedia(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = () => {
    if (!selectedMedia) return;
    onPublish({
      mediaUrl: selectedMedia,
      mediaType,
      caption,
      expiryHours,
      isStealth: stealthMode
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border-0 sm:border border-slate-700/80 rounded-none sm:rounded-3xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Hidden native file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-700/60 bg-[#0f172a]/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-white text-base">انتشار استوری در GODFATHER SQUAD</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Preview Image / Video or Placeholder to pick from phone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-900 group cursor-pointer flex flex-col items-center justify-center transition-all"
            title="برای انتخاب فایل از گالری کلیک کنید"
          >
            {selectedMedia ? (
              <>
                {mediaType === 'video' ? (
                  <video src={selectedMedia} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={selectedMedia} alt="Story preview" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white mb-1" />
                  <span className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-full font-bold">
                    تغییر تصویر/ویدیو از گالری گوشی
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-md">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">انتخاب عکس یا ویدیو از گالری گوشی</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    برای باز شدن گالری گوشی و انتخاب مستقیم تصویر، روی این قسمت کلیک کنید.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>باز کردن گالری گوشی</span>
                </button>
              </div>
            )}
          </div>

          {selectedMedia && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>انتخاب عکس/ویدیو دیگر از گالری</span>
              </button>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">متن و کپشن استوری:</label>
            <input
              type="text"
              placeholder="چیزی بنویسید... (پشتیبانی از هشتگ و اموجی)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Expiry Selector (6, 12, 24, 48 hours) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>مدت زمان نمایش استوری:</span>
              </span>
              <span className="text-cyan-400 font-bold">{expiryHours} ساعت</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[6, 12, 24, 48].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setExpiryHours(hours)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    expiryHours === hours
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                      : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-white'
                  }`}
                >
                  {hours} ساعت
                  {hours === 48 && <span className="block text-[9px] text-amber-400 font-bold">پریمیوم</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Premium Stealth Mode */}
          {isPremium && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-800/40">
              <div>
                <div className="text-xs font-bold text-purple-200">حالت روح در انتشار (Stealth Mode)</div>
                <div className="text-[11px] text-slate-400">عدم نمایش نشان جدید در بالای فید برای کاربران ناشناس</div>
              </div>
              <input
                type="checkbox"
                checked={stealthMode}
                onChange={(e) => setStealthMode(e.target.checked)}
                className="w-4 h-4 accent-purple-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-700/60 bg-[#0f172a]/80 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            onClick={handlePublish}
            disabled={!selectedMedia}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>انتشار استوری</span>
          </button>
        </div>
      </div>
    </div>
  );
};
