import React, { useState, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  Trash2, 
  Check, 
  Download, 
  Star, 
  Plus, 
  Image as ImageIcon,
  Share2
} from 'lucide-react';

interface ProfilePhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  photos: string[];
  canEdit?: boolean;
  onAddPhoto?: (photoUrl: string) => void;
  onDeletePhoto?: (index: number) => void;
  onSetMainPhoto?: (index: number) => void;
}

export const ProfilePhotoViewerModal: React.FC<ProfilePhotoViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  photos,
  canEdit = false,
  onAddPhoto,
  onDeletePhoto,
  onSetMainPhoto
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Safe photo list
  const safePhotos = photos && photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&auto=format&fit=crop&q=80'];
  const safeIndex = Math.min(currentIndex, safePhotos.length - 1);
  const currentPhoto = safePhotos[safeIndex] || safePhotos[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % safePhotos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleUploadNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && onAddPhoto) {
          onAddPhoto(reader.result);
          setCurrentIndex(safePhotos.length); // Jump to newly added photo
          showToast('عکس جدید با موفقیت به آلبوم پروفایل افزوده شد');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteCurrent = () => {
    if (safePhotos.length <= 1) {
      showToast('حداقل یک عکس پروفایل باید در آلبوم باقی بماند');
      return;
    }
    if (onDeletePhoto) {
      onDeletePhoto(safeIndex);
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      showToast('عکس از آلبوم پروفایل حذف شد');
    }
  };

  const handleSetCurrentAsMain = () => {
    if (onSetMainPhoto) {
      onSetMainPhoto(safeIndex);
      showToast('این عکس به عنوان تصویر اصلی پروفایل انتخاب شد');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Bar with Story Segments Progress & Actions */}
      <div 
        className="w-full max-w-2xl mx-auto flex flex-col gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars (Story-like indicators) */}
        {safePhotos.length > 1 && (
          <div className="flex gap-1.5 w-full pt-1">
            {safePhotos.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                  idx === safeIndex ? 'bg-cyan-400' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-white py-2">
          {/* Title & Counter */}
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">{title}</h3>
              <p className="text-[11px] text-slate-300">
                {subtitle || 'عکس‌های پروفایل'} • عکس {safeIndex + 1} از {safePhotos.length}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {canEdit && (
              <>
                {/* Add new photo to album */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUploadNewPhoto} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  title="افزودن عکس جدید به آلبوم"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">افزودن عکس</span>
                </button>

                {/* Set as main photo */}
                {safeIndex !== 0 && (
                  <button
                    type="button"
                    onClick={handleSetCurrentAsMain}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition-all cursor-pointer"
                    title="انتخاب به عنوان عکس پیش‌فرض پروفایل"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}

                {/* Delete photo */}
                {safePhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrent}
                    className="p-2 bg-slate-800 hover:bg-rose-900/60 text-rose-400 rounded-xl transition-all cursor-pointer"
                    title="حذف این عکس از آلبوم"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image Viewer Area */}
      <div 
        className="relative flex-1 flex items-center justify-center max-w-4xl mx-auto w-full my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Photo Button */}
        {safePhotos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl hover:scale-105"
            title="عکس قبلی"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* The Photo Container */}
        <div className="relative max-h-[75vh] max-w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
          <img 
            src={currentPhoto} 
            alt={`Profile photo ${safeIndex + 1}`}
            className="max-h-[75vh] max-w-full object-contain select-none animate-in fade-in zoom-in-95 duration-200"
          />

          {/* Indicator of Primary Avatar */}
          {safeIndex === 0 && (
            <div className="absolute top-3 right-3 bg-cyan-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full border border-cyan-400/50 shadow-lg flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span>عکس اصلی پروفایل</span>
            </div>
          )}
        </div>

        {/* Next Photo Button */}
        {safePhotos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl hover:scale-105"
            title="عکس بعدی"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div 
        className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {safePhotos.map((photo, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
              i === safeIndex
                ? 'border-cyan-400 ring-2 ring-cyan-500/40 scale-105'
                : 'border-slate-700 opacity-60 hover:opacity-100'
            }`}
          >
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </button>
        ))}

        {canEdit && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-600 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer bg-slate-900/50"
            title="افزودن عکس بیشتر"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
