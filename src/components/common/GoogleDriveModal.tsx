import React from 'react';
import { Cloud, FileSpreadsheet, Check, X, ExternalLink, HardDrive } from 'lucide-react';
import { DriveUploadedFile } from '../../services/googleDriveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  tripCount: number;
  totalAmount: number;
  onConfirmUpload: () => Promise<void>;
  isUploading: boolean;
  uploadedFile: DriveUploadedFile | null;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  fileName,
  tripCount,
  totalAmount,
  onConfirmUpload,
  isUploading,
  uploadedFile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">บันทึกรายงานลง Google Drive</h3>
              <p className="text-xs text-blue-100">Google Workspace Cloud Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {uploadedFile ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                บันทึกไฟล์สำเร็จเรียบร้อย!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
                ไฟล์รายงานสรุปค่าขนส่งถูกอัปโหลดขึ้น Google Drive ของคุณเรียบร้อยแล้ว
              </p>

              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 text-left mb-5 flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Microsoft Excel Worksheet (.xlsx)
                  </p>
                </div>
              </div>

              {uploadedFile.webViewLink && (
                <a
                  href={uploadedFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  เปิดไฟล์ใน Google Drive
                </a>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-4 mb-5 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
                <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <p className="font-semibold mb-1">ยืนยันการสร้างและบันทึกไฟล์:</p>
                  <p>
                    ระบบจะส่งออกรายงาน <strong>Automated Transportation Billing Report</strong> ในรูปแบบ Excel (.xlsx) และบันทึกลงใน Google Drive ส่วนตัวของคุณโดยตรง
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs bg-slate-50 dark:bg-slate-700/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">ชื่อไฟล์ที่จัดเก็บ:</span>
                  <span className="font-medium text-slate-800 dark:text-white font-mono">{fileName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">จำนวนเที่ยวขนส่ง:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{tripCount} เที่ยว</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">ยอดรวมค่าขนส่ง (THB):</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={onConfirmUpload}
                  disabled={isUploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      ยืนยันบันทึกลง Drive
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
