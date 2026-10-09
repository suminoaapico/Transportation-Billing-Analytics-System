import React, { useState } from 'react';
import {
  BookOpen,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Scale,
  Truck,
  Sparkles,
  FileSpreadsheet,
  Fuel,
  HardDrive,
  Search,
  ChevronRight,
  ShieldAlert,
  Info,
  DollarSign,
  Settings,
  HelpCircle,
  FileText,
} from 'lucide-react';

export const UserManualPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('netlify-auth');
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your-site.netlify.app';

  const handleCopyHostname = () => {
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const sections = [
    {
      id: 'netlify-auth',
      title: '1. แก้ปัญหา Firebase (auth/unauthorized-domain) บน Netlify',
      icon: <Globe className="w-4 h-4 text-rose-500" />,
      badge: 'สำคัญมาก',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    },
    {
      id: 'branches-nlc-blc',
      title: '2. ทำความเข้าใจสาขา: นวนคร (NLC) vs บางบ่อ (BLC) & Roland',
      icon: <Truck className="w-4 h-4 text-blue-500" />,
      badge: 'โครงสร้างสาขา',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      id: 'reconciliation',
      title: '3. ระบบเทียบราคา & ตรวจสอบทริปครบถ้วน (Price Comparison)',
      icon: <Scale className="w-4 h-4 text-emerald-500" />,
      badge: 'โมดูลหลัก',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'diff-reasons',
      title: '4. การวิเคราะห์เหตุผลที่เกิด Diff อัตโนมัติ (8 สาเหตุ)',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      badge: 'Auto-diagnosis',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'master-data',
      title: '5. ระบบจัดการประเภทรถ ค่าใช้จ่าย และเงื่อนไข (Master Data)',
      icon: <Settings className="w-4 h-4 text-purple-500" />,
      badge: 'ตั้งค่าระบบ',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    },
    {
      id: 'quotation-ocr',
      title: '6. การใช้งาน AI OCR อ่านใบเสนอราคา (Quotation OCR)',
      icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
      badge: 'AI Powered',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      id: 'diesel-monthly-avg',
      title: '7. การคิดราคาน้ำมันเฉลี่ยรายเดือน (Monthly Average) & Rate Card',
      icon: <Fuel className="w-4 h-4 text-cyan-500" />,
      badge: 'สูตรคำนวณ',
      badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    },
    {
      id: 'import-export-backup',
      title: '8. การนำเข้า Raw Data, สำรองข้อมูล Google Drive & Export',
      icon: <HardDrive className="w-4 h-4 text-slate-500" />,
      badge: 'Integration',
      badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Manual Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
            คู่มือการใช้งานระบบฉบับละเอียด (System Operating Manual)
          </span>
          <span className="text-xs text-slate-400">• อัปเดตล่าสุด 2026</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5 text-white">
          <BookOpen className="w-7 h-7 text-blue-400" />
          คู่มือการใช้งานระบบตรวจสอบค่าขนส่ง GTT Logistics
        </h1>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
          รวมขั้นตอนการทำงาน ปัญหาที่พบบ่อย (รวมถึงวิธีแก้ Firebase Error เมื่อ Deploy ขึ้น Netlify), การเทียบยอดสาขานวนคร (NLC) และบางบ่อ (BLC), การวิเคราะห์ Diff และการตั้งค่า Master Data
        </p>

        {/* Quick Search inside manual */}
        <div className="mt-4 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาในคู่มือ เช่น netlify, roland, diff, นวนคร, ค่าดรอป..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Grid Layout: Navigation Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            หัวข้อคู่มือ (Contents)
          </div>
          <div className="space-y-1">
            {sections.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition flex items-start justify-between gap-2 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">{sec.icon}</span>
                    <span className="line-clamp-2 leading-tight">{sec.title}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Quick Domain Copy Helper Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 text-xs space-y-2 mt-4">
            <span className="text-[10px] text-blue-400 font-bold block uppercase tracking-wider">
              โดเมนปัจจุบันของระบบ:
            </span>
            <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-amber-300 truncate">
              {currentHostname}
            </div>
            <button
              onClick={handleCopyHostname}
              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 rounded text-[11px] font-bold text-white flex items-center justify-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedDomain ? 'คัดลอกเรียบร้อย! ✅' : 'คัดลอก Domain ไปใส่ Firebase'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 1: NETLIFY DEPLOY & FIREBASE ERROR (auth/unauthorized-domain) */}
          {(activeSection === 'netlify-auth' || searchQuery.includes('netlify') || searchQuery.includes('unauthorized')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    วิธีแก้ไขปัญหา Firebase Error (auth/unauthorized-domain) เมื่อ Deploy บน Netlify
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      พบบ่อยสุด
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    กรณีที่ Deploy แอปขึ้น Netlify แล้วกด "ลงชื่อเข้าใช้ Google Drive / Google Login" ไม่ผ่าน
                  </p>
                </div>
              </div>

              {/* Problem Cause Explanation */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  สาเหตุที่เกิดข้อผิดพลาดนี้:
                </div>
                <p className="leading-relaxed">
                  Firebase Authentication มีระบบความปลอดภัยสูงมาก จะอนุญาตให้ Google Popup Login ทำงานได้เฉพาะบนโดเมนที่ระบุไว้ใน <strong>"Authorized Domains"</strong> เท่านั้น เมื่อคุณนำโปรเจกต์ไปสร้างบน Netlify โดเมนใหม่ของคุณ (เช่น <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">{currentHostname}</code>) ยังไม่ได้รับอนุญาตใน Firebase Console
                </p>
              </div>

              {/* Step-by-Step Fix Guide */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  ขั้นตอนการแก้ไข (ใช้เวลาเพียง 1 นาที):
                </h3>

                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div className="space-y-1">
                      <strong className="text-slate-900 dark:text-white block">คัดลอก Domain ของคุณบน Netlify</strong>
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 font-bold">
                          {currentHostname}
                        </span>
                        <button
                          onClick={handleCopyHostname}
                          className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedDomain ? 'คัดลอกแล้ว' : 'คัดลอก'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div className="space-y-1">
                      <strong className="text-slate-900 dark:text-white block">เปิด Firebase Console ไปที่เมนู Authentication</strong>
                      <p className="text-slate-500">
                        เข้าสู่ระบบ <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline font-semibold inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-3 h-3" /></a> &rarr; เลือกโปรเจกต์ของคุณ &rarr; คลิกเมนู <strong>Authentication</strong> ด้านซ้าย
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div className="space-y-1">
                      <strong className="text-slate-900 dark:text-white block">ไปที่แท็บ Settings &rarr; Authorized domains</strong>
                      <p className="text-slate-500">
                        คลิกแท็บ <strong>Settings</strong> &rarr; เลื่อนลงมาที่หัวข้อ <strong>Authorized domains</strong> &rarr; กดปุ่ม <strong>"Add domain"</strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      4
                    </span>
                    <div className="space-y-1">
                      <strong className="text-slate-900 dark:text-white block">วางชื่อโดเมนและกดบันทึก</strong>
                      <p className="text-slate-500">
                        วางค่า <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{currentHostname}</code> (หรือ <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">netlify.app</code>) แล้วกด <strong>Add</strong> จากนั้นกลับมากดเข้าสู่ระบบได้ทันที!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Console Button */}
              <div className="pt-2 flex items-center gap-3">
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  เปิด Firebase Console ทันที
                </a>
                <span className="text-[11px] text-slate-500">
                  * หากไม่ต้องการใช้ Google Drive สามารถใช้ระบบคำนวณและ Export Excel ได้ตามปกติโดยไม่ต้องล็อกอิน
                </span>
              </div>
            </div>
          )}

          {/* SECTION 2: BRANCHES - NLC VS BLC & ROLAND */}
          {(activeSection === 'branches-nlc-blc' || searchQuery.includes('นวนคร') || searchQuery.includes('บางบ่อ') || searchQuery.includes('roland')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    ทำความเข้าใจโครงสร้างข้อมูลสาขา: นวนคร (NLC) vs บางบ่อ (BLC)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ความแตกต่างสำคัญของข้อมูลที่สาขาส่งยอดมาตรวจ และแนวทางตรวจสอบที่ถูกต้อง
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* NLC Card */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                    สาขานวนคร (NLC)
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    ข้อมูลแปลงไว้ที่ไฟล์ Excel แล้ว (ดูง่ายที่สุด)
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    ✅ <strong>ลักษณะข้อมูล:</strong> ข้อมูลของนวนครถูกแปลงและจัดโครงสร้างไว้ในไฟล์ Excel เรียบร้อยแล้ว ด้านในจะมีราคาของแต่ละประเภทรถ (4W, 6W, 10W) ตามเรทราคาชัดเจน
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    🔍 <strong>วิธีตรวจ:</strong> ยอดที่สาขานวนครส่งมาให้ตรวจจะเทียบตรงกับตาราง Rate Card ของนวนคร โดยอิงราคาน้ำมันเฉลี่ยรายเดือน (Monthly Average 40.69 ฿/L) ทำให้ความแม่นยำสูงและตรวจสอบง่าย
                  </p>
                </div>

                {/* BLC Card */}
                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 space-y-2">
                  <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold">
                    สาขาบางบ่อ (BLC)
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    มีตัวอย่างเฉพาะของ Roland ที่ยืนยันได้
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    ⚠️ <strong>ลักษณะข้อมูล:</strong> ตัวอย่างที่ถูกต้องแบบ 100% จะไม่มี มีแต่ราคาที่สาขาส่งยอดมาให้ตรวจสอบ
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    🎯 <strong>ข้อยกเว้นสำคัญ:</strong> ยกเว้นแค่ของบางบ่อที่เป็นของ <strong>"Roland"</strong> ที่มีตัวอย่าง/สัญญาชัดเจน ส่วนลูกค้ารายอื่นจะใช้วิธีนำยอดสาขาส่งมาเทียบกับระบบเพื่อหาส่วนต่าง (Diff) และสาเหตุที่ยอดไม่ตรง
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRICE COMPARISON & TRIP RECONCILIATION */}
          {(activeSection === 'reconciliation' || searchQuery.includes('เทียบราคา') || searchQuery.includes('reconciliation')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    คู่มือการใช้งานหน้าจอ "เทียบราคา & ตรวจสอบทริปครบถ้วน" (Prompt 1)
                  </h2>
                  <p className="text-xs text-slate-500">
                    วิธีใช้งาน Filter Bar, การอ่าน Summary Cards, การตรวจเช็คทริป และการดู Diff Table
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 space-y-1">
                  <strong className="text-slate-900 dark:text-white block">1. ตัวกรองข้อมูล (Filter Bar):</strong>
                  <p className="text-slate-500">
                    สามารถเลือกกรองตาม สาขา ([นวนคร NLC] [บางบ่อ BLC] [ทั้งหมด]), เลือกประเภทรถ (4W, 6W, 10W, OD), เลือกบริษัทแบบ Multi-select, หรือกรองตามสถานะ Diff เพื่อดูเฉพาะทริปที่มีปัญหา
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 space-y-1">
                  <strong className="text-slate-900 dark:text-white block">2. ความหมายของสีในตาราง Diff Breakdown:</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                      🟢 <strong>เขียว (ตรงกัน 100%):</strong> ส่วนต่าง = 0 บาท ผ่านการตรวจสอบทันที
                    </div>
                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                      🟡 <strong>เหลือง (ต่างเล็กน้อย &lt; 5%):</strong> มักเกิดจากเศษค่าน้ำมัน หรือค่าทางด่วน
                    </div>
                    <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
                      🔴 <strong>แดง (ต่างมาก &ge; 5%):</strong> ต้องตรวจสอบ! อาจเกิดจากประเภทรถผิด หรือมีค่าใช้จ่ายนอกเรท
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 space-y-1">
                  <strong className="text-slate-900 dark:text-white block">3. การตรวจสอบทริปครบถ้วน (Trip Completeness Check):</strong>
                  <p className="text-slate-500 leading-relaxed">
                    ระบบใช้วิธีนับ <strong>1 ทริป = 1 Trip No. (ไม่ซ้ำ)</strong> กรณีที่ 1 ทริปมีหลาย Job จะนับรวมเป็น 1 ทริป เพื่อตรวจสอบว่ามีทริปไหนใน Raw Data ที่สาขาไม่ได้ส่งยอดมาตรวจ (Missing Trips) หรือทริปที่ยกเลิกแต่ถูกนำมารวม
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: 8 DIFF REASONS */}
          {(activeSection === 'diff-reasons' || searchQuery.includes('เหตุผล') || searchQuery.includes('diff')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    ระบบวิเคราะห์เหตุผลที่ Diff อัตโนมัติ (Diff Reason Analyzer)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ตารางตรวจสอบ 8 เหตุผลที่เป็นไปได้เมื่อยอดคำนวณไม่ตรงกับยอดที่สาขาส่งมา
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-1/3">เหตุผลที่เป็นไปได้</th>
                      <th className="p-3 border-b border-slate-200 dark:border-slate-700">เงื่อนไขการตรวจสอบและวิธีแก้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    <tr>
                      <td className="p-3 font-semibold text-rose-600">🔸 ไม่ match Zone</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Delivery District ไม่มีในตาราง Mapping &rarr; ไปที่เมนู Master Data เพื่อเพิ่มคำค้นหาอำเภอ/จังหวัด</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-rose-600">🔸 ไม่พบราคาในเรท</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">ปลายทางหรือประเภทรถไม่มีใน Rate Card &rarr; เพิ่มแถวปลายทางใน Rate Card 4W/6W/10W</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-600">🔸 ราคาน้ำมันไม่ตรง</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">สาขาใช้ราคารายวัน vs ระบบใช้ค่าเฉลี่ยรายเดือน (Monthly Average) &rarr; ตรวจสอบวิธีคิดราคาน้ำมัน</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-600">🔸 ค่าดรอปไม่ครบ</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">มียอด Drop Fee ในยอดสาขา แต่ Raw Data ไม่มี Drop Count &rarr; ตรวจสอบจำนวนจุดส่งเพิ่ม</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-600">🔸 ค่า OT ไม่ครบ</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">มีค่าล่วงเวลา OT ในยอดสาขา แต่ระบบไม่ได้คิด &rarr; ตรวจสอบเวลาออกจากโรงงาน / ใบบันทึกเวลา</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-blue-600">🔸 ทริปซ้ำ/ขาด</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Trip No. ไม่ตรงกัน หรือมี Job ตกหล่น &rarr; ดูรายงานในแท็บ Trip Completeness Check</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-blue-600">🔸 ประเภทรถผิด</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Mapping 4W/6W/10W/OD ไม่ถูกต้อง &rarr; แก้ไข Truck Type Mapping ใน Master Data</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-purple-600">🔸 ค่าใช้จ่ายอื่นไม่ครบ</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">มีค่าทางด่วน, ค่าค้างคืน, ค่าคนยกของ (Porter) ที่สาขาเบิกตามจริง &rarr; ตรวจสลิปใบเสร็จแนบ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 5: MASTER DATA MANAGER */}
          {(activeSection === 'master-data' || searchQuery.includes('master') || searchQuery.includes('truck type') || searchQuery.includes('ค่าใช้จ่าย')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    ระบบจัดการประเภทรถ ค่าใช้จ่าย และเงื่อนไข (Master Data Manager - Prompt 2)
                  </h2>
                  <p className="text-xs text-slate-500">
                    จัดการประเภทรถ (Truck Type Mapping), ตารางค่าใช้จ่ายทั้งหมด (Fees) และเงื่อนไขการคิดเงิน (Conditions)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-blue-600 block">1) จัดการประเภทรถ (Truck Type)</span>
                  <p className="text-slate-500">
                    แปลงประเภทรถจากระบบ GTT เช่น <code className="font-mono">4W/Single Unit</code> &rarr; <code className="font-mono">4W</code>, <code className="font-mono">4W/Trailer</code> &rarr; <code className="font-mono">OD4</code>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-purple-600 block">2) จัดการค่าใช้จ่าย (Fees Manager)</span>
                  <p className="text-slate-500">
                    กำหนดค่าใช้จ่าย F01 ถึง F12 เช่น Drop Fee (500฿), OT (250฿/ชม.), ค่าทางด่วน (120฿), ค่าค้างคืน (1,000฿), ค่าแรงยกของ (200฿)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-emerald-600 block">3) เงื่อนไขการคิดเงิน (Conditions)</span>
                  <p className="text-slate-500">
                    กฎ Backhaul (เที่ยวกลับ 50%), Multi-drop (จุดแรกฟรี), ขั้นต่ำต่อเที่ยว, สัญญา Roland บางบ่อ, และลูกค้า Fixed Diesel
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: AI OCR QUOTATION */}
          {(activeSection === 'quotation-ocr' || searchQuery.includes('ocr') || searchQuery.includes('ใบเสนอราคา')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    การใช้งาน AI OCR อ่านใบเสนอราคา (Quotation Management)
                  </h2>
                  <p className="text-xs text-slate-500">
                    รองรับไฟล์ PDF, Excel, รูปภาพสัญญา พร้อมอ่านค่าเรทรถ 4W/6W/10W, ค่าดรอป และเงื่อนไขอัตโนมัติ
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <strong className="text-slate-800 dark:text-white block">ขั้นตอนการใช้งาน:</strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li>ไปที่เมนู <strong>"ใบเสนอราคา & AI OCR"</strong> บนแถบเมนูด้านซ้าย</li>
                  <li>ลากไฟล์ PDF / Excel หรือคลิกเพื่อเลือกไฟล์ใบเสนอราคาของลูกค้า</li>
                  <li>ระบบ AI OCR จะสกัดชื่อบริษัท, สาขา, อัตราค่าขนส่งตามประเภทรถ, และค่าใช้จ่ายพิเศษ</li>
                  <li>ตรวจสอบความถูกต้องในหน้าจอพรีวิว และกด <strong>"บันทึกใบเสนอราคา"</strong></li>
                  <li>เมื่อมีเที่ยววิ่งของลูกค้ารายนั้น ระบบจะนำเรทในใบเสนอราคามาคำนวณอัตโนมัติทันที</li>
                </ol>
              </div>
            </div>
          )}

          {/* SECTION 7: MONTHLY AVERAGE DIESEL */}
          {(activeSection === 'diesel-monthly-avg' || searchQuery.includes('น้ำมัน') || searchQuery.includes('average')) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 text-cyan-600 rounded-lg">
                  <Fuel className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    การคำนวณราคาน้ำมันเฉลี่ยรายเดือน (Monthly Average Diesel)
                  </h2>
                  <p className="text-xs text-slate-500">
                    มาตรฐานการคิดค่าน้ำมันที่ไม่ผันผวน เพื่อขจัดปัญหา Diff กับลูกค้า
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 space-y-2">
                <p className="leading-relaxed">
                  ✅ <strong>เหตุผลที่ต้องใช้ค่าเฉลี่ยรายเดือน:</strong> หากคำนวณด้วยราคาน้ำมันรายวัน จะเกิดปัญหา Diff ตลอดเวลาเนื่องจากราคาน้ำมันในปั๊มปรับเปลี่ยนทุกวัน ระบบจึงใช้สูตร:
                </p>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-cyan-300 dark:border-cyan-700 font-mono text-center font-bold text-slate-900 dark:text-white">
                  Monthly Average = (ผลรวมราคาขายปลีกดีเซล ปตท. 30 วันในเดือนนั้น) / 30 = 40.69 บาท/ลิตร
                </div>
                <p className="leading-relaxed">
                  จากนั้นนำค่าเฉลี่ย 40.69 บาท ไปเปิดตาราง Rate Card ใน Bracket <strong>40.01 - 42.00 (h_40_42)</strong> ทำให้ราคาตรงกับใบเสร็จที่สาขาส่งตรวจ 100%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
