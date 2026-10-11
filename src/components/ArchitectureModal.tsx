import React, { useState } from 'react';
import { PHASE1_SPEC } from '../data/phase1-architecture';
import { Database, ShieldCheck, Cpu, GitBranch, X, Copy, Check, ArrowRight, Server, Lock } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose, isSuperAdmin = false }) => {
  const [activeTab, setActiveTab] = useState<'srp' | 'postgres' | 'cassandra' | 'redis' | 'webrtc'>('srp');
  const [activeStep, setActiveStep] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
        <div className="bg-[#1e293b] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">دسترسی غیرمجاز</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            مستندات معماری و مهندسی سیستم منحصراً مخصوص مدیریت ارشد سامانه است و کاربران عادی به آن دسترسی ندارند.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-[#0f172a]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                فاز ۱: معماری سیستم، جریان احراز هویت و پایگاه‌های داده
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  CloudPulse v1.0-RC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                طراحی توزیع‌شده PostgreSQL، ScyllaDB، پروتکل ۲FA SRP-6a و زیرساخت بلادرنگ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/60 px-6 bg-[#0f172a]/40 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('srp')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'srp'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            جریان احراز هویت ۲FA (SRP-6a)
          </button>
          <button
            onClick={() => setActiveTab('postgres')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'postgres'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            شمای رابطه‌ای (PostgreSQL 16)
          </button>
          <button
            onClick={() => setActiveTab('cassandra')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'cassandra'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            تایم‌لاین مقیاس‌پذیر (ScyllaDB / Cassandra)
          </button>
          <button
            onClick={() => setActiveTab('redis')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'redis'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            کش و پیام‌رسانی (Redis 7.2)
          </button>
          <button
            onClick={() => setActiveTab('webrtc')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'webrtc'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            معماری تماس (WebRTC SFU & E2EE)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'srp' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-sm leading-relaxed">
                <strong>پروتکل Secure Remote Password (SRP-6a) با هش سخت‌افزاری Argon2id:</strong>
                در این پروتکل احراز هویت دوعاملی تلگرام، رمز عبور کاربر هرگز و تحت هیچ شرایطی از کلاینت به سرور ارسال نمی‌شود (Zero-Knowledge Proof). محاسبات با کلید‌های یکبار مصرف Ephemeral و ضرب هم‌نهشتی اعداد بزرگ انجام می‌گیرد.
              </div>

              {/* Step indicator */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {PHASE1_SPEC.srpSequence.map((step) => (
                  <button
                    key={step.step}
                    onClick={() => setActiveStep(step.step)}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      activeStep === step.step
                        ? 'border-cyan-500 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/10'
                        : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold text-cyan-400 mb-1">
                      مرحله {step.step}
                    </div>
                    <div className="text-xs font-medium truncate">{step.title}</div>
                  </button>
                ))}
              </div>

              {/* Active Step Details */}
              {(() => {
                const step = PHASE1_SPEC.srpSequence.find((s) => s.step === activeStep) || PHASE1_SPEC.srpSequence[0];
                return (
                  <div className="bg-[#0f172a]/80 border border-slate-700 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white flex items-center gap-2">
                        <span>مرحله {step.step}: {step.title}</span>
                      </span>
                      <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 bg-slate-800 rounded-lg text-slate-300">
                        <span className="text-emerald-400">{step.sender}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-cyan-400">{step.receiver}</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/40 p-3.5 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-400 mb-1 font-mono">Payload (داده ارسالی):</div>
                        <pre className="text-xs text-amber-300 font-mono whitespace-pre-wrap">{step.payload}</pre>
                      </div>
                      <div className="bg-black/40 p-3.5 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-400 mb-1 font-mono">فرمول ریاضی و اعتبارسنجی:</div>
                        <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">{step.mathFormula}</pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'postgres' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">
                  اسکریپت DDL کامل ایجاد جداول هسته کاربران، نشست‌ها، گروه‌ها، تاپیک‌ها و سطوح دسترسی RBAC:
                </span>
                <button
                  onClick={() => copyToClipboard(PHASE1_SPEC.postgresSchema)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'کپی شد' : 'کپی SQL'}
                </button>
              </div>
              <pre
                dir="ltr"
                className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto max-h-[500px]"
              >
                {PHASE1_SPEC.postgresSchema}
              </pre>
            </div>
          )}

          {activeTab === 'cassandra' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">
                  شمای CQL برای پایگاه توزیع‌شده ScyllaDB با استراتژی کامپکشن TimeWindow و پارتیشن‌بندی هفتگی:
                </span>
                <button
                  onClick={() => copyToClipboard(PHASE1_SPEC.cassandraSchema)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'کپی CQL' : 'کپی CQL'}
                </button>
              </div>
              <pre
                dir="ltr"
                className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto max-h-[500px]"
              >
                {PHASE1_SPEC.cassandraSchema}
              </pre>
            </div>
          )}

          {activeTab === 'redis' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">
                  الگوهای کلیدهای Redis 7.2 برای پیگیری آنلاین بودن، تایپینگ، همگام‌سازی پیش‌نویس‌های ابری (Cloud Drafts) و توکن‌باکت:
                </span>
                <button
                  onClick={() => copyToClipboard(PHASE1_SPEC.redisKeyspace)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'کپی' : 'کپی دستورات'}
                </button>
              </div>
              <pre
                dir="ltr"
                className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl font-mono text-xs text-amber-300 overflow-x-auto max-h-[500px]"
              >
                {PHASE1_SPEC.redisKeyspace}
              </pre>
            </div>
          )}

          {activeTab === 'webrtc' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 text-sm leading-relaxed">
                <strong>معماری رسانه WebRTC SFU با ۴ اموجی اعتبارسنجی رمزنگاری:</strong>
                سرور SFU (مانند Mediasoup) جریان‌های تصویری را بدون رمزگشایی به کلاینت‌ها فوروارد می‌کند. اموجی‌های راستی‌آزمایی کلید تماس بر مبنای SHA-256 گواهینامه‌های DTLS-SRTP طرفین تماس ساخته می‌شوند تا از حملات Man-in-the-Middle جلوگیری گردد.
              </div>
              <pre
                dir="ltr"
                className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl font-mono text-xs text-purple-300 overflow-x-auto max-h-[500px]"
              >
                {PHASE1_SPEC.webrtcTopology}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/60 bg-[#0f172a]/60 text-xs text-slate-400">
          <span>وضعیت فاز ۱: مستندات، اسکیمای دیتابیس و اندپوینت‌های بک‌اند عملیاتی شدند.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
