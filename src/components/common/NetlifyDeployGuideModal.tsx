import React from 'react';
import { Cloud, CheckCircle, AlertTriangle, ExternalLink, X, Terminal, FileCode, Check } from 'lucide-react';

interface NetlifyDeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetlifyDeployGuideModal: React.FC<NetlifyDeployGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">คู่มือแก้ไข & Deploy หน้าเว็บไปยัง Netlify</h3>
              <p className="text-xs text-blue-100">
                ทำไม Deploy ผ่าน https://transportationbilling.netlify.app/ แล้วหน้าเว็บไม่แสดงผล?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-200">
          {/* Cause Analysis */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 dark:text-amber-200">สาเหตุที่พบบ่อยที่สุดที่ทำให้หน้าเว็บไม่ขึ้นบน Netlify:</h4>
              <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc list-inside space-y-1">
                <li>
                  <strong>ลากโฟลเดอร์ผิด (หากใช้ Drag & Drop):</strong> ผู้ใช้ลากโฟลเดอร์ Root Project ทั้งหมดขึ้นไปแทนที่จะลากโฟลเดอร์ <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">dist/</code> ที่ Build แล้ว ทำให้เบราว์เซอร์เปิดไฟล์ TypeScript <code className="font-mono">/src/main.tsx</code> ตรงๆ ไม่ได้
                </li>
                <li>
                  <strong>Node.js Version:</strong> Netlify ใช้เวอร์ชัน Node ต่ำกว่า 20 (เราได้ตั้งค่า <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">NODE_VERSION = "20"</code> ใน <code className="font-mono">netlify.toml</code> แล้ว)
                </li>
                <li>
                  <strong>SPA Routing 404:</strong> ยังไม่มีไฟล์ <code className="font-mono">_redirects</code> สำหรับ Single Page Application (เราได้สร้างไฟล์ <code className="font-mono">public/_redirects</code> แล้ว)
                </li>
              </ul>
            </div>
          </div>

          {/* Step-by-Step Fixes */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              วิธีแก้ไขและตั้งค่าที่ถูกต้องบน Netlify
            </h4>

            {/* Option A: Git deploy */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2">
              <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs">1</span>
                กรณี Deploy ผ่าน Git (GitHub / GitLab)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                ไปที่หน้า Netlify Dashboard &rarr; <strong>Site configuration</strong> &rarr; <strong>Build & deploy</strong> ตรวจสอบค่าต่อไปนี้:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                <div>
                  <span className="text-slate-400 block font-sans">Build command:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">npm run build</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Publish directory:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">dist</span>
                </div>
              </div>
            </div>

            {/* Option B: Manual Deploy */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2">
              <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs">2</span>
                กรณี Deploy ด้วยตนเอง (Netlify Drag & Drop)
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1">
                <li>สั่งรันคำสั่ง <code className="bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded font-mono font-bold">npm run build</code> ในเครื่อง</li>
                <li>ระบบจะสร้างโฟลเดอร์ชื่อ <code className="bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-300">dist/</code> ขึ้นมา</li>
                <li>ลากเฉพาะโฟลเดอร์ <strong>dist/</strong> ไปวางในช่อง Deploy บนหน้าเว็บ Netlify (ห้ามลากโฟลเดอร์โปรเจกต์หลัก)</li>
              </ol>
            </div>

            {/* Option C: Firebase Authorized Domains */}
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
              <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-center text-xs font-bold">3</span>
                กรณีลงชื่อเข้าใช้ Google ไม่สำเร็จ: Firebase Error (auth/unauthorized-domain)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                เนื่องจาก Firebase Authentication มีระบบความปลอดภัยที่อนุญาตให้ Google Sign-In เฉพาะโดเมนที่ระบุไว้เท่านั้น เมื่อเปิดผ่าน <code className="bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded font-mono font-bold">transportationbilling.netlify.app</code> ให้ทำตามขั้นตอนนี้:
              </p>
              <ol className="text-xs text-slate-700 dark:text-slate-200 list-decimal list-inside space-y-1">
                <li>เปิด <strong>Firebase Console</strong> &rarr; เมนู <strong>Authentication</strong></li>
                <li>ไปที่แท็บ <strong>Settings</strong> &rarr; หัวข้อ <strong>Authorized domains</strong></li>
                <li>กด <strong>Add domain</strong> แล้วใส่: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400 border border-slate-300">transportationbilling.netlify.app</code> แล้วกด Save</li>
                <li>หรือคลิกปุ่ม <strong>"เข้าสู่ระบบโหมดทดสอบ (Demo Sign In)"</strong> เพื่อใช้งาน Google Drive และดาวน์โหลดไฟล์ตัวอย่างได้ทันทีโดยไม่ต้องรอตั้งค่า</li>
              </ol>
            </div>

            {/* Config already injected */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" />
                ไฟล์คอนฟิกที่โปรเจกต์นี้เตรียมไว้ให้แล้ว:
              </div>
              <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1 font-mono">
                <div>&bull; <strong>netlify.toml</strong>: กำหนด Publish Directory = dist และ NODE_VERSION = 20</div>
                <div>&bull; <strong>public/_redirects</strong>: รองรับ SPA URL rewriting (/* &rarr; /index.html 200)</div>
                <div>&bull; <strong>vite.config.ts</strong>: ปรับ Base URL = '/' รองรับ Netlify Domain สมบูรณ์</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
