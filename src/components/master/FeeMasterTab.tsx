import React, { useState } from 'react';
import { FeeMasterItem } from '../../types';
import { DollarSign, Plus, Trash2, Edit2, Search, Save, X, Layers, Filter } from 'lucide-react';

interface FeeMasterTabProps {
  feeItems: FeeMasterItem[];
  onUpdateFeeItems: (items: FeeMasterItem[]) => void;
}

export const FeeMasterTab: React.FC<FeeMasterTabProps> = ({
  feeItems,
  onUpdateFeeItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ทั้งหมด');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formCode, setFormCode] = useState('F13');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'หลัก' | 'ผันแปร' | 'เพิ่ม' | 'ตามจริง' | 'หัก'>('เพิ่ม');
  const [formCalcMethod, setFormCalcMethod] = useState('ต่อจุด');
  const [formRateAmount, setFormRateAmount] = useState('500');
  const [formBranch, setFormBranch] = useState<'นวนคร' | 'บางบ่อ' | 'ทั้งหมด'>('ทั้งหมด');
  const [formApplicableCompanies, setFormApplicableCompanies] = useState('ทั้งหมด');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    const nextCodeNum = feeItems.length + 1;
    setFormCode(`F${String(nextCodeNum).padStart(2, '0')}`);
    setFormName('');
    setFormCategory('เพิ่ม');
    setFormCalcMethod('ต่อครั้ง/เที่ยว');
    setFormRateAmount('300');
    setFormBranch('ทั้งหมด');
    setFormApplicableCompanies('ทั้งหมด');
    setFormNotes('');
    setIsAdding(true);
  };

  const handleOpenEdit = (item: FeeMasterItem) => {
    setEditingId(item.id);
    setFormCode(item.code);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormCalcMethod(item.calculationMethod);
    setFormRateAmount(String(item.rateAmount));
    setFormBranch(item.branch);
    setFormApplicableCompanies(item.applicableCompanies);
    setFormNotes(item.notes || '');
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const rateNum = parseFloat(formRateAmount) || 0;

    if (editingId) {
      const updated = feeItems.map((item) =>
        item.id === editingId
          ? {
              ...item,
              code: formCode.trim(),
              name: formName.trim(),
              category: formCategory,
              calculationMethod: formCalcMethod.trim(),
              rateAmount: rateNum,
              branch: formBranch,
              applicableCompanies: formApplicableCompanies.trim(),
              notes: formNotes.trim(),
            }
          : item
      );
      onUpdateFeeItems(updated);
    } else {
      const newItem: FeeMasterItem = {
        id: `fee-${Date.now()}`,
        code: formCode.trim(),
        name: formName.trim(),
        category: formCategory,
        calculationMethod: formCalcMethod.trim(),
        rateAmount: rateNum,
        branch: formBranch,
        applicableCompanies: formApplicableCompanies.trim(),
        active: true,
        notes: formNotes.trim(),
      };
      onUpdateFeeItems([...feeItems, newItem]);
    }

    setIsAdding(false);
    setEditingId(null);
  };

  const handleToggleActive = (id: string) => {
    onUpdateFeeItems(
      feeItems.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('คุณต้องการลบรายการค่าใช้จ่ายนี้หรือไม่?')) {
      onUpdateFeeItems(feeItems.filter((f) => f.id !== id));
    }
  };

  const filteredItems = feeItems.filter((item) => {
    if (filterCategory !== 'ทั้งหมด' && item.category !== filterCategory) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.calculationMethod.toLowerCase().includes(q) ||
        item.applicableCompanies.toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>ระบบจัดการค่าใช้จ่ายทั้งหมด (Extra Fees Manager - Prompt 2.2)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {feeItems.length} รายการ (F01 - F12)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดอัตราค่าบริการเสริม เช่น Drop Fee (จุดส่งเพิ่ม), ค่า OT, ค่าทางด่วน (Toll), ค่าค้างคืน, ค่าแรงยกของ (Labour/Porter) และค่าซีลตู้
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการค่าใช้จ่าย (Add Fee)
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อค่าใช้จ่าย รหัส F01, OT, Drop, Toll, Porter..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto">
            <span className="text-slate-400 text-[11px] whitespace-nowrap">หมวดหมู่:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium"
            >
              <option value="ทั้งหมด">ทั้งหมด (All Categories)</option>
              <option value="หลัก">หลัก (Base Rates)</option>
              <option value="ผันแปร">ผันแปร (Fuel Variable)</option>
              <option value="เพิ่ม">เพิ่ม (Accessorial / Drop / OT)</option>
              <option value="ตามจริง">ตามจริง (Pass-Through / Toll)</option>
              <option value="หัก">หัก (Deduction)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <form
          onSubmit={handleSave}
          className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-xl border border-emerald-200 dark:border-emerald-900 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              {editingId ? 'แก้ไขรายการค่าใช้จ่าย' : 'เพิ่มรายการค่าใช้จ่ายใหม่'}
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                รหัสค่าใช้จ่าย (Code): *
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="เช่น F01, F13"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                ชื่อค่าใช้จ่าย (Fee Name): *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="เช่น Drop Fee (ค่าจุดส่งเพิ่ม), ค่าล่วงเวลา OT"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                หมวดหมู่: *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              >
                <option value="หลัก">หลัก (Base)</option>
                <option value="ผันแปร">ผันแปร (Fuel)</option>
                <option value="เพิ่ม">เพิ่ม (Accessorial)</option>
                <option value="ตามจริง">ตามจริง (Actual)</option>
                <option value="หัก">หัก (Deduction)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                วิธีคิดเงิน: *
              </label>
              <input
                type="text"
                required
                value={formCalcMethod}
                onChange={(e) => setFormCalcMethod(e.target.value)}
                placeholder="เช่น ต่อจุด, ชม.ละ, ตามบิล"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                อัตรามาตรฐาน (บาท/หน่วย): *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formRateAmount}
                onChange={(e) => setFormRateAmount(e.target.value)}
                placeholder="เช่น 500"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                สาขาที่ใช้: *
              </label>
              <select
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              >
                <option value="ทั้งหมด">ทั้งหมด (All)</option>
                <option value="นวนคร">นวนคร (NLC)</option>
                <option value="บางบ่อ">บางบ่อ (BLC)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                มีผลกับบริษัท: *
              </label>
              <input
                type="text"
                value={formApplicableCompanies}
                onChange={(e) => setFormApplicableCompanies(e.target.value)}
                placeholder="เช่น ทั้งหมด, SIEMENS, ROLAND"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] text-slate-500 mb-1">
                หมายเหตุ / กฎการคิดเงิน:
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="เช่น จุดแรกฟรี คิดจุดที่ 2 เป็นต้นไป หรือคิดล่วงเวลาหลัง 17:00 น."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกค่าใช้จ่าย
            </button>
          </div>
        </form>
      )}

      {/* Fees Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-3 font-mono">รหัส</th>
                <th className="py-3 px-4">ชื่อค่าใช้จ่าย</th>
                <th className="py-3 px-3 text-center">หมวดหมู่</th>
                <th className="py-3 px-3">วิธีคิดเงิน</th>
                <th className="py-3 px-3 text-right">อัตรา (บาท)</th>
                <th className="py-3 px-3 text-center">สาขา</th>
                <th className="py-3 px-3">บริษัทที่ใช้</th>
                <th className="py-3 px-4">หมายเหตุ</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
                <th className="py-3 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    ไม่พบรายการค่าใช้จ่ายที่ตรงกับตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'หลัก'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : item.category === 'ผันแปร'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : item.category === 'เพิ่ม'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {item.calculationMethod}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {item.rateAmount > 0 ? `฿${item.rateAmount.toLocaleString()}` : 'ตามเรท'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold">
                        {item.branch}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[120px]">
                      {item.applicableCompanies}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate text-[11px]">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          item.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {item.active ? 'ใช้งาน' : 'ปิด'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
