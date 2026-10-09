import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, ExternalLink, X, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { AuthDomainErrorInfo } from '../../services/googleDriveService';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorInfo: AuthDomainErrorInfo | null;
  onDemoSignIn: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  errorInfo,
  onDemoSignIn,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const domain =
    errorInfo?.domain || (typeof window !== 'undefined' ? window.location.hostname : 'transportationbilling.netlify.app');
  const consoleUrl =
    errorInfo?.consoleUrl ||
    'https://console.firebase.google.com/project/avid-wavelet-365901/authentication/settings';

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full shadow-2xl border border-rose-200 dark:border-rose-900 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                แก้ไขปัญหา Firebase: Error (auth/unauthorized-domain)
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                โดเมน Netlify ยังไม่ได้รับอนุญาตในระบบความปลอดภัย Firebase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1.5">
            <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 text-xs">
              <span>ทำไมถึงเกิดข้อผิดพลาดนี้บน Netlify?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Firebase Authentication มีระบบป้องกันความปลอดภัย (Domain Whitelist) โดยจะอนุญาตให้ลงชื่อเข้าใช้ด้วย Google เฉพาะโดเมนที่ระบุไว้เท่านั้น เมื่อเปิดผ่าน <strong>{domain}</strong> เบราว์เซอร์จึงปฏิเสธการล็อกอิน
            </p>
          </div>

          {/* Quick Solution 1: Demo Sign In Bypass (Instant) */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/60 dark:to-slate-700/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                วิธีที่ 1: เข้าสู่ระบบโหมดทดสอบทันที (ไม่ต้องตั้งค่า Firebase)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                แนะนำ ⚡
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              ใช้งานฟีเจอร์ Google Drive, บันทึกไฟล์ Excel, และดาวน์โหลดไฟล์ตัวอย่างได้ทันทีในโหมดจำลอง (Demo Account: <strong>artkitthana12@gmail.com</strong>)
            </p>
            <button
              onClick={() => {
                onDemoSignIn();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>เข้าสู่ระบบโหมดทดสอบ (Demo Sign In) ทันที</span>
            </button>
          </div>

          {/* Solution 2: Add Domain to Firebase Console */}
          <div className="space-y-3 pt-1">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span>วิธีที่ 2: เพิ่มโดเมนลงใน Firebase Console (ถาวร)</span>
            </h4>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/60 rounded-lg border border-slate-200 dark:border-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                  1
                </span>
                <span className="flex-1 text-slate-600 dark:text-slate-300">
                  คัดลอกชื่อโดเมน Netlify ของคุณ:
                </span>
                <div className="flex items-center gap-1.5">
                  <code className="px-2 py-1 bg-white dark:bg-slate-800 rounded font-mono font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 text-[11px]">
                    {domain}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 rounded text-slate-700 dark:text-slate-200 transition-colors"
                    title="คัดลอกโดเมน"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/60 rounded-lg border border-slate-200 dark:border-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                  2
                </span>
                <span className="flex-1 text-slate-600 dark:text-slate-300">
                  เปิด Firebase Console &rarr; <strong>Authentication</strong> &rarr; แท็บ <strong>Settings</strong> &rarr; <strong>Authorized domains</strong>
                </span>
                <a
                  href={consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center gap-1 transition-colors text-[11px] shrink-0"
                >
                  เปิด Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/60 rounded-lg border border-slate-200 dark:border-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                  3
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  คลิก <strong>"Add domain"</strong> วางค่า <strong>{domain}</strong> แล้วกด <strong>Save</strong> จากนั้นรีเฟรชหน้าเว็บนี้เพื่อล็อกอิน Google ได้อย่างสมบูรณ์
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
