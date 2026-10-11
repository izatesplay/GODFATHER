import React, { useState } from 'react';

interface FormattedTextProps {
  text: string;
}

export const SpoilerSpan: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(!revealed);
      }}
      className={`spoiler-text transition-all duration-200 cursor-pointer px-1 py-0.5 rounded ${
        revealed
          ? 'bg-white/10 text-inherit filter-none'
          : 'spoiler-hidden bg-slate-600/80 hover:bg-slate-500/80 select-none'
      }`}
      title={revealed ? 'پنهان کردن اسپویلر' : 'برای مشاهده کلیک کنید'}
    >
      {children}
    </span>
  );
};

export const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
  if (!text) return null;

  // Check for code blocks ```code```
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const rawContent = part.slice(3, -3);
            const firstLineBreak = rawContent.indexOf('\n');
            let lang = 'code';
            let code = rawContent;
            if (firstLineBreak > 0 && firstLineBreak < 20) {
              lang = rawContent.slice(0, firstLineBreak).trim();
              code = rawContent.slice(firstLineBreak + 1);
            }
            return (
              <div
                key={index}
                dir="ltr"
                className="my-2 p-2.5 rounded-lg bg-[#18222d] border border-slate-700/60 font-mono text-xs overflow-x-auto text-emerald-400 select-text"
              >
                <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-700/50 pb-1 mb-1.5 font-sans">
                  <span>{lang.toUpperCase()}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(code)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <pre className="whitespace-pre-wrap">{code}</pre>
              </div>
            );
          }
          return <FormattedInlineText key={index} text={part} />;
        })}
      </div>
    );
  }

  return <FormattedInlineText text={text} />;
};

const FormattedInlineText: React.FC<{ text: string }> = ({ text }) => {
  // Parse Spoilers ||spoiler||
  const spoilerSegments = text.split(/(\|\|[\s\S]*?\|\|)/g);

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {spoilerSegments.map((segment, sIndex) => {
        if (segment.startsWith('||') && segment.endsWith('||')) {
          const inner = segment.slice(2, -2);
          return <SpoilerSpan key={sIndex}>{inner}</SpoilerSpan>;
        }

        // Inline markdown parser: **bold**, `code`, tags (#Tag)
        const tokens = segment.split(/(\*\*.*?\*\*|`.*?`|#[a-zA-Z0-9_\u0600-\u06FF]+)/g);
        return tokens.map((token, tIndex) => {
          if (token.startsWith('**') && token.endsWith('**')) {
            return (
              <strong key={tIndex} className="font-bold text-white">
                {token.slice(2, -2)}
              </strong>
            );
          }
          if (token.startsWith('`') && token.endsWith('`')) {
            return (
              <code
                key={tIndex}
                dir="ltr"
                className="font-mono text-xs bg-black/30 text-amber-300 px-1.5 py-0.5 rounded mx-0.5 border border-amber-500/20"
              >
                {token.slice(1, -1)}
              </code>
            );
          }
          if (token.startsWith('#')) {
            return (
              <span
                key={tIndex}
                className="text-cyan-400 hover:underline cursor-pointer font-medium"
              >
                {token}
              </span>
            );
          }
          return token;
        });
      })}
    </span>
  );
};
