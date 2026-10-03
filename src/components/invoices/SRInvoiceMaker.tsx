import React, { useState } from 'react';
import { db, getTodayDateString } from '../../db/storage';
import { AppLanguage, Invoice, InvoiceItem, SalesRepresentative } from '../../types';
import {
  formatCurrency,
  formatNumber,
  toBengaliNumber,
} from '../../utils/formatters';
import {
  Plus,
  Trash2,
  Save,
  Printer,
  Receipt,
  CheckCircle2,
  Calendar,
  Hash,
  UserCheck,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';

interface Props {
  lang: AppLanguage;
  onInvoiceSaved?: (invoiceId: string) => void;
  editingInvoice?: Invoice | null;
  onCancelEdit?: () => void;
}

export const SRInvoiceMaker: React.FC<Props> = ({
  lang,
  onInvoiceSaved,
  editingInvoice,
  onCancelEdit,
}) => {
  const products = db.getProducts();
  const srs = db.getSRs();
  const settings = db.getSettings();

  const [date, setDate] = useState(editingInvoice?.date || getTodayDateString());
  const [invoiceNumber] = useState(
    editingInvoice?.invoiceNumber || db.generateNextInvoiceNumber('sr')
  );
  const [selectedSRId, setSelectedSRId] = useState<string>(
    editingInvoice?.srId || (srs.length > 0 ? srs[0].id : '')
  );
  const [customerOrShopName, setCustomerOrShopName] = useState(
    editingInvoice?.dealerName || ''
  );
  const [route, setRoute] = useState(
    editingInvoice?.route || (srs.length > 0 ? srs[0].areaRoute : '')
  );
  const [notes, setNotes] = useState(editingInvoice?.notes || '');
  const [paidAmount, setPaidAmount] = useState<number>(editingInvoice?.paidAmount || 0);

  // S.R Daily Delivery & Field Expenses (গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি)
  const [vehicleNumber, setVehicleNumber] = useState(
    editingInvoice?.vehicleNumber || 'বগুড়া-থ-১১২৪ (ভ্যান/পিকআপ)'
  );
  const [vehicleRent, setVehicleRent] = useState<number>(
    editingInvoice?.expenses?.vehicleRent || 0
  );
  const [snacksCost, setSnacksCost] = useState<number>(
    editingInvoice?.expenses?.snacksCost || 0
  );
  const [commissionAdjustment, setCommissionAdjustment] = useState<number>(
    editingInvoice?.expenses?.commissionAdjustment || 0
  );
  const [labourCost, setLabourCost] = useState<number>(
    editingInvoice?.expenses?.labourCost || 0
  );
  const [otherExpenses, setOtherExpenses] = useState<number>(
    editingInvoice?.expenses?.otherExpenses || 0
  );
  const [showExpenseSection, setShowExpenseSection] = useState<boolean>(true);

  const selectedSR: SalesRepresentative | undefined = srs.find((s) => s.id === selectedSRId);

  // Sync route if SR changes
  const handleSRSelect = (srId: string) => {
    setSelectedSRId(srId);
    const sr = srs.find((s) => s.id === srId);
    if (sr) {
      setRoute(sr.areaRoute);
    }
  };

  // Initial items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (editingInvoice && editingInvoice.items.length > 0) {
      return editingInvoice.items;
    }
    if (products.length > 0) {
      const p = products[0];
      const defaultDiscount = 0; // ALWAYS default to 0% commission as requested!
      const srPrice = p.srPrice || p.tradePrice;
      return [
        {
          productId: p.id,
          productName: p.name,
          productNameBn: p.nameBn,
          bulkUnit: p.bulkUnit || 'কার্টুন',
          baseUnit: p.baseUnit || 'পিস',
          piecesPerCarton: p.piecesPerCarton,
          cartonQty: 1,
          pieceQty: 0,
          totalPieces: p.piecesPerCarton,
          tp: p.tradePrice,
          tpPerCarton: p.tradePrice * p.piecesPerCarton,
          discountPercent: 0, // ALWAYS 0%
          dp: Number(srPrice.toFixed(2)),
          dpPerCarton: Number((srPrice * p.piecesPerCarton).toFixed(2)),
          lineTotal: Number((p.piecesPerCarton * srPrice).toFixed(2)),
          damageCarton: 0,
          damagePiece: 0,
          damageTotalPieces: 0,
          damageAmount: 0,
          returnCarton: 0,
          returnPiece: 0,
          returnTotalPieces: 0,
          returnAmount: 0,
          netSoldPieces: p.piecesPerCarton,
          netLineTotal: Number((p.piecesPerCarton * srPrice).toFixed(2)),
        },
      ];
    }
    return [];
  });

  const [printModalInvoice, setPrintModalInvoice] = useState<Invoice | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Calculation recalculator for a row
  const recalcRow = (item: InvoiceItem): InvoiceItem => {
    const totalPieces = item.cartonQty * item.piecesPerCarton + item.pieceQty;
    // Calculate dp: if discountPercent is specified, calculate from tp, else preserve dp or fallback to tradePrice
    const dp = item.discountPercent > 0
      ? Number((item.tp - (item.tp * item.discountPercent) / 100).toFixed(2))
      : (item.dp || item.tp);
    const lineTotal = Number((totalPieces * dp).toFixed(2));

    const damageTotalPieces =
      (item.damageCarton || 0) * item.piecesPerCarton + (item.damagePiece || 0);
    const damageAmount = Number((damageTotalPieces * dp).toFixed(2));

    const returnTotalPieces =
      (item.returnCarton || 0) * item.piecesPerCarton + (item.returnPiece || 0);
    const returnAmount = Number((returnTotalPieces * dp).toFixed(2));

    const netSoldPieces = Math.max(0, totalPieces - (damageTotalPieces + returnTotalPieces));
    const netLineTotal = Number((netSoldPieces * dp).toFixed(2));

    return {
      ...item,
      totalPieces,
      dp: Number(dp.toFixed(2)),
      dpPerCarton: Number((dp * item.piecesPerCarton).toFixed(2)),
      lineTotal,
      damageTotalPieces,
      damageAmount,
      returnTotalPieces,
      returnAmount,
      netSoldPieces,
      netLineTotal,
    };
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.productId = prod.id;
      item.productName = prod.name;
      item.productNameBn = prod.nameBn;
      item.bulkUnit = prod.bulkUnit || 'কার্টুন';
      item.baseUnit = prod.baseUnit || 'পিস';
      item.piecesPerCarton = prod.piecesPerCarton;
      item.tp = prod.tradePrice;
      item.tpPerCarton = prod.tradePrice * prod.piecesPerCarton;
      // Default commission % stays 0 unless already customized
      item.discountPercent = item.discountPercent || 0;
      const srPrice = item.discountPercent > 0
        ? prod.tradePrice - (prod.tradePrice * item.discountPercent) / 100
        : (prod.srPrice || prod.tradePrice);
      item.dp = Number(srPrice.toFixed(2));
      item.dpPerCarton = Number((srPrice * prod.piecesPerCarton).toFixed(2));
      copy[index] = recalcRow(item);
      return copy;
    });
  };

  const handleQtyChange = (
    index: number,
    field: 'cartonQty' | 'pieceQty' | 'damagePiece' | 'returnPiece',
    val: number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: Math.max(0, val || 0) };
      copy[index] = recalcRow(item);
      return copy;
    });
  };

  const handleDiscountChange = (index: number, discountPercent: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const disc = Math.max(0, Math.min(100, discountPercent || 0));
      const item = { ...copy[index], discountPercent: disc };
      // Update dp based on discount
      item.dp = Number((item.tp - (item.tp * disc) / 100).toFixed(2));
      copy[index] = recalcRow(item);
      return copy;
    });
  };

  const handleDPChange = (index: number, dp: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.dp = Math.max(0, dp || 0);
      if (item.tp > 0) {
        item.discountPercent = Number((((item.tp - item.dp) / item.tp) * 100).toFixed(2));
      }
      copy[index] = recalcRow(item);
      return copy;
    });
  };

  const handleAddRow = (forDamageOrReturnOnly: boolean = false) => {
    if (products.length === 0) return;
    const p = products[0];
    const srPrice = p.srPrice || p.tradePrice;

    const newItem: InvoiceItem = recalcRow({
      productId: p.id,
      productName: p.name,
      productNameBn: p.nameBn,
      bulkUnit: p.bulkUnit || 'কার্টুন',
      baseUnit: p.baseUnit || 'পিস',
      piecesPerCarton: p.piecesPerCarton,
      cartonQty: forDamageOrReturnOnly ? 0 : 1,
      pieceQty: 0,
      totalPieces: forDamageOrReturnOnly ? 0 : p.piecesPerCarton,
      tp: p.tradePrice,
      tpPerCarton: p.tradePrice * p.piecesPerCarton,
      discountPercent: 0, // ALWAYS default to 0% as requested!
      dp: Number(srPrice.toFixed(2)),
      dpPerCarton: Number((srPrice * p.piecesPerCarton).toFixed(2)),
      lineTotal: forDamageOrReturnOnly ? 0 : Number((p.piecesPerCarton * srPrice).toFixed(2)),
      damageCarton: 0,
      damagePiece: 0,
      damageTotalPieces: 0,
      damageAmount: 0,
      returnCarton: 0,
      returnPiece: 0,
      returnTotalPieces: 0,
      returnAmount: 0,
      netSoldPieces: forDamageOrReturnOnly ? 0 : p.piecesPerCarton,
      netLineTotal: forDamageOrReturnOnly ? 0 : Number((p.piecesPerCarton * srPrice).toFixed(2)),
    });

    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Product Totals & Monetary Calculations
  const totalCartons = items.reduce((sum, item) => sum + item.cartonQty, 0);
  const totalPieces = items.reduce((sum, item) => sum + item.totalPieces, 0);
  const totalGrossAmount = Number(
    items.reduce((sum, item) => sum + item.totalPieces * item.tp, 0).toFixed(2)
  );
  const totalDiscount = Number(
    items
      .reduce((sum, item) => sum + (item.totalPieces * item.tp - item.lineTotal), 0)
      .toFixed(2)
  );
  // ধাপ ১: মোট বিক্রিত পণ্যের টাকা (Gross Sales)
  const totalSalesAmount = Number(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );

  // ধাপ ২: মোট বিক্রি থেকে ফেরত ও ড্যামেজ সমন্বয়
  const totalReturnPieces = items.reduce(
    (sum, item) => sum + (item.returnTotalPieces || 0),
    0
  );
  const totalReturnAmount = Number(
    items.reduce((sum, item) => sum + (item.returnAmount || (item.returnTotalPieces || 0) * item.dp), 0).toFixed(2)
  );

  const totalDamagePieces = items.reduce(
    (sum, item) => sum + (item.damageTotalPieces || 0),
    0
  );
  const totalDamageAmount = Number(
    items.reduce((sum, item) => sum + (item.damageAmount || (item.damageTotalPieces || 0) * item.dp), 0).toFixed(2)
  );

  // ফেরত ও ড্যামেজ সমন্বয়ের পর প্রকৃত বিক্রয় (মার্কেট সেলস কালেকশন)
  const netSalesAfterDamageReturn = Number(
    Math.max(0, totalSalesAmount - totalReturnAmount - totalDamageAmount).toFixed(2)
  );

  // ধাপ ৩: ফিল্ডের সকল খরচ (গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি, লেবার, বিবিধ)
  const totalFieldExpenses = Number(
    (
      (vehicleRent || 0) +
      (snacksCost || 0) +
      (labourCost || 0) +
      (otherExpenses || 0) +
      (commissionAdjustment || 0)
    ).toFixed(2)
  );

  // ধাপ ৪: সমন্বিত বিক্রয় থেকে ফিল্ডের সকল খরচ বাদ দিয়ে অফিসে জমাযোগ্য নিট ক্যাশ (Office Cash)
  const officeCashToDeposit = Number(
    Math.max(0, netSalesAfterDamageReturn - totalFieldExpenses).toFixed(2)
  );

  // ধাপ ৫: অফিসে প্রকৃতপক্ষে জমা দেওয়া ক্যাশ (paidAmount) দিয়ে অফিস ক্যাশ মিলানো:
  const dueAmount = Number(Math.max(0, officeCashToDeposit - paidAmount).toFixed(2));
  const isZeroDue = dueAmount === 0 && (paidAmount > 0 || officeCashToDeposit === 0);

  // Build Invoice
  const buildInvoice = (): Invoice => {
    return {
      id: editingInvoice?.id || `inv-sr-${Date.now()}`,
      invoiceNumber,
      invoiceType: 'sr',
      date,
      srId: selectedSR?.id,
      srName: selectedSR?.name,
      dealerName: customerOrShopName || 'সাধারণ খুচরা বিক্রেতা / বাজার',
      route,
      vehicleNumber: vehicleNumber || undefined,
      items,
      totalCartons,
      totalPieces,
      totalGrossAmount,
      totalDiscount,
      netAmount: officeCashToDeposit,
      paidAmount,
      dueAmount,
      totalDamagePieces,
      totalDamageAmount,
      totalReturnPieces,
      totalReturnAmount,
      netActualSalesAmount: officeCashToDeposit,
      expenses:
        totalFieldExpenses > 0
          ? {
              vehicleRent,
              snacksCost,
              commissionAdjustment,
              labourCost,
              otherExpenses,
              totalExpenses: totalFieldExpenses,
              netCashCollected: officeCashToDeposit,
            }
          : undefined,
      notes,
      createdBy: 'Admin',
      createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = (andPrint: boolean = false) => {
    if (items.length === 0) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে অন্তত একটি পণ্য যোগ করুন।' : 'Please add at least one product.');
      return;
    }

    const invoice = buildInvoice();
    db.saveInvoice(invoice, editingInvoice);

    // If field expenses are recorded, automatically synchronize to the central Expense Sheet!
    if (totalFieldExpenses > 0) {
      db.saveExpenseEntry({
        id: `exp-${invoice.id}`,
        date: invoice.date,
        srId: invoice.srId,
        srName: invoice.srName,
        dealerName: invoice.dealerName,
        route: invoice.route,
        invoiceNumber: invoice.invoiceNumber,
        vehicleNumber: vehicleNumber || 'ভ্যান / ডেলিভারি পিকআপ',
        vehicleRent,
        snacksCost,
        commissionAdjustment,
        labourCost,
        otherExpenses,
        totalExpense: totalFieldExpenses,
        salesCollection: netSalesAfterDamageReturn,
        netCashDeposit: officeCashToDeposit,
        notes: `এস.আর চালান ${invoice.invoiceNumber}-এর ডেলিভারি ও ফিল্ড খরচ`,
        createdAt: new Date().toISOString(),
      });
    }

    setSaveSuccessMsg(
      lang === 'bn'
        ? `এস.আর চালান ${invoice.invoiceNumber} সফলভাবে সংরক্ষিত হয়েছে। ড্যামেজ, রিটার্ন ও ডেলিভারি খরচ শিট স্বয়ংক্রিয়ভাবে আপডেট হয়েছে!`
        : `S.R Invoice ${invoice.invoiceNumber} saved! Damage, return, stock & expense sheet updated.`
    );

    if (andPrint) {
      setPrintModalInvoice(invoice);
    }

    if (onInvoiceSaved) {
      onInvoiceSaved(invoice.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {editingInvoice
                  ? lang === 'bn'
                    ? 'এস.আর চালান সংশোধন (Edit S.R Invoice)'
                    : 'Edit S.R Invoice'
                  : lang === 'bn'
                  ? 'নতুন এস.আর বিক্রয় চালান (New S.R Invoice)'
                  : 'New S.R Sales Invoice'}
              </h1>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'এস.আর সেলস, ড্যামেজ ও রিটার্নসহ সমন্বিত বিক্রয় হিসাব এবং স্টক অটো-আপডেট'
                  : 'S.R field sales invoice with per-row damage and return ledger tracking'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editingInvoice && onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'bn' ? 'চালান সংরক্ষণ করুন' : 'Save S.R Invoice'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'bn' ? 'সংরক্ষণ ও প্রিন্ট' : 'Save & Print A4'}</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* SR Metadata Grid (Requirement 7) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 pt-2">
          {/* Invoice Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'bn' ? 'চালান নং (Auto)' : 'Invoice #'}</span>
            </label>
            <input
              type="text"
              readOnly
              value={invoiceNumber}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'bn' ? 'তারিখ' : 'Date'}</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* S.R Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'bn' ? 'এস.আর নির্বাচন' : 'S.R Name'}</span>
            </label>
            <select
              value={selectedSRId}
              onChange={(e) => handleSRSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-emerald-600"
            >
              {srs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.srCode})
                </option>
              ))}
            </select>
          </div>

          {/* Route / Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'bn' ? 'রুট / এলাকা' : 'Route / Area'}</span>
            </label>
            <input
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g. Kichok - Shibganj"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Dealer or Retail Shop Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {lang === 'bn' ? 'ডিলার / দোকানের নাম' : 'Dealer / Store Name'}
            </label>
            <input
              type="text"
              value={customerOrShopName}
              onChange={(e) => setCustomerOrShopName(e.target.value)}
              placeholder={lang === 'bn' ? 'দোকান / ডিলারের নাম' : 'Store name...'}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {selectedSR && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-900">
            <div>
              <span>
                <strong>{selectedSR.name}</strong> ({selectedSR.srCode}) · মোবাইল: {selectedSR.mobile} · রুট: {selectedSR.areaRoute}
              </span>
            </div>
            <div>
              <span>{lang === 'bn' ? 'মাসিক টার্গেট:' : 'Monthly Target:'}</span>{' '}
              <strong className="font-mono-num font-bold text-emerald-800">
                {formatCurrency(selectedSR.monthlyTarget, lang)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* S.R Product Table (Requirement 7: SL, Product Name, Carton, Piece, T.P, %, SR Price, Sales Amount, Damage, Return, Net Sales) */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              {lang === 'bn' ? 'এস.আর পণ্য ছক (বিক্রয়, ড্যামেজ ও রিটার্ন)' : 'S.R Product Table (Sales, Damage & Return)'}
            </h2>
            <span className="text-[11px] text-slate-500">
              {lang === 'bn' ? 'প্রতিটি আইটেমে ড্যামেজ ও রিটার্ন ইনপুট করুন' : 'Record damage & return per item'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRow(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-300 transition"
              title="মার্কেটে মাল না গেলেও শুধু ড্যামেজ বা ফেরত সমন্বয় করতে এই বোতাম ব্যবহার করুন"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{lang === 'bn' ? '+ শুধু ড্যামেজ/ফেরত পণ্য যোগ' : '+ Damage/Return Only'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRow(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ নতুন রো যোগ করুন' : '+ Add Row'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse min-w-[880px]">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-2 text-center w-10">ক্রমিক</th>
                <th className="py-2.5 px-3 min-w-[200px]">Product Name (একক ও রেট)</th>
                <th className="py-2.5 px-2 text-center w-24">কার্টুন / বস্তা</th>
                <th className="py-2.5 px-2 text-center w-24">পিস / কেজি / লিটার</th>
                <th className="py-2.5 px-2 text-right w-20">T.P</th>
                <th className="py-2.5 px-2 text-center w-16">%</th>
                <th className="py-2.5 px-2 text-right w-24 bg-blue-50/60 text-blue-900 font-bold">S.R Price</th>
                <th className="py-2.5 px-2 text-right w-24">Sales Amt</th>
                <th className="py-2.5 px-2 text-center w-20 bg-rose-50/60 text-red-800">Damage (Pcs)</th>
                <th className="py-2.5 px-2 text-center w-20 bg-amber-50/60 text-amber-900">Return (Pcs)</th>
                <th className="py-2.5 px-3 text-right w-28 bg-slate-50 font-bold">Net Sales</th>
                <th className="py-2.5 px-2 text-center w-10">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const bUnit = item.bulkUnit || prod?.bulkUnit || 'কার্টুন';
                const sUnit = item.baseUnit || prod?.baseUnit || 'পিস';

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    {/* SL */}
                    <td className="py-2 px-2 text-center font-mono text-slate-500">
                      {lang === 'bn' ? toBengaliNumber(idx + 1) : idx + 1}
                    </td>

                    {/* Product Name */}
                    <td className="py-2 px-3">
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-800 focus:ring-1 focus:ring-emerald-600"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nameBn || p.name} (১{p.bulkUnit || 'কার্টুন'}={p.piecesPerCarton}{p.baseUnit || 'পিস'} | S.R: ৳{p.srPrice || p.dealerPrice})
                          </option>
                        ))}
                      </select>
                      {item.cartonQty === 0 && item.pieceQty === 0 && ((item.damageTotalPieces || 0) > 0 || (item.returnTotalPieces || 0) > 0) && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-200">
                          ⚠️ {lang === 'bn' ? 'মার্কেটে যায়নি (শুধু ড্যামেজ/ফেরত কর্তন)' : 'Not in market (Damage/Return deduction)'}
                        </span>
                      )}
                    </td>

                    {/* Carton / Bulk */}
                    <td className="py-2 px-2 text-center">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={item.cartonQty}
                          onChange={(e) => handleQtyChange(idx, 'cartonQty', parseInt(e.target.value, 10))}
                          className="w-full text-center py-1.5 px-1 font-mono-num font-semibold bg-white border border-slate-300 rounded-md"
                        />
                        <span className="block text-[9px] text-slate-400 mt-0.5">{bUnit}</span>
                      </div>
                    </td>

                    {/* Piece / Base Unit */}
                    <td className="py-2 px-2 text-center">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={item.pieceQty}
                          onChange={(e) => handleQtyChange(idx, 'pieceQty', parseInt(e.target.value, 10))}
                          className="w-full text-center py-1.5 px-1 font-mono-num font-semibold bg-white border border-slate-300 rounded-md"
                        />
                        <span className="block text-[9px] text-slate-400 mt-0.5">{sUnit}</span>
                      </div>
                    </td>

                    {/* T.P */}
                    <td className="py-2 px-2 text-right font-mono-num text-slate-700">
                      {formatNumber(item.tp, lang)}
                    </td>

                    {/* Discount % */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={item.discountPercent}
                        onChange={(e) => handleDiscountChange(idx, parseFloat(e.target.value))}
                        className="w-full text-center py-1.5 px-1 font-mono-num bg-white border border-slate-300 rounded-md text-emerald-800"
                      />
                    </td>

                    {/* SR Price */}
                    <td className="py-2 px-2 text-right bg-blue-50/30">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.dp}
                        onChange={(e) => handleDPChange(idx, parseFloat(e.target.value))}
                        className="w-full text-right py-1.5 px-1.5 font-mono-num font-bold text-blue-900 bg-white border border-blue-300 rounded-md"
                      />
                    </td>

                    {/* Gross Sales Amount */}
                    <td className="py-2 px-2 text-right font-mono-num text-slate-700">
                      {formatCurrency(item.lineTotal, lang)}
                    </td>

                    {/* Damage Piece */}
                    <td className="py-2 px-2 text-center bg-rose-50/30">
                      <input
                        type="number"
                        min="0"
                        value={item.damagePiece || 0}
                        onChange={(e) => handleQtyChange(idx, 'damagePiece', parseInt(e.target.value, 10))}
                        className="w-full text-center py-1.5 px-1 font-mono-num text-red-700 font-bold bg-white border border-rose-300 rounded-md"
                      />
                      {(item.damageTotalPieces || 0) > 0 && (
                        <span className="block text-[10px] font-bold text-red-700 mt-0.5 whitespace-nowrap">
                          -৳{formatNumber(item.damageAmount || 0, lang)}
                        </span>
                      )}
                    </td>

                    {/* Return Piece */}
                    <td className="py-2 px-2 text-center bg-amber-50/30">
                      <input
                        type="number"
                        min="0"
                        value={item.returnPiece || 0}
                        onChange={(e) => handleQtyChange(idx, 'returnPiece', parseInt(e.target.value, 10))}
                        className="w-full text-center py-1.5 px-1 font-mono-num text-amber-800 font-bold bg-white border border-amber-300 rounded-md"
                      />
                      {(item.returnTotalPieces || 0) > 0 && (
                        <span className="block text-[10px] font-bold text-amber-800 mt-0.5 whitespace-nowrap">
                          -৳{formatNumber(item.returnAmount || 0, lang)}
                        </span>
                      )}
                    </td>

                    {/* Net Sales */}
                    <td className="py-2 px-3 text-right bg-slate-50 font-mono-num font-bold text-slate-900">
                      {formatCurrency(item.netLineTotal || 0, lang)}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* S.R Daily Field Expense Sheet Section (গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি, লেবার) */}
        <div className="mt-5 p-4 bg-amber-50/60 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/70">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                ৳
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                  {lang === 'bn' ? 'এস.আর দৈনিক ফিল্ড খরচ ও ডেলিভারি হিসাব শিট' : 'S.R Daily Field & Delivery Expense Sheet'}
                </h3>
                <p className="text-[11px] text-amber-800">
                  {lang === 'bn'
                    ? 'গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি সমন্বয় ও লেবার খরচ এন্ট্রি (সংগৃহীত ক্যাশ থেকে স্বয়ংক্রিয় কর্তন)'
                    : 'Vehicle fare, snacks, commission adjustment and net cash deposit calculation'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExpenseSection(!showExpenseSection)}
              className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md border border-amber-300 transition"
            >
              {showExpenseSection ? (lang === 'bn' ? 'লুকান' : 'Collapse') : (lang === 'bn' ? 'দেখান' : 'Expand')}
            </button>
          </div>

          {showExpenseSection && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                {/* Vehicle Rent */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'গাড়ি ভাড়া (Vehicle Fare)' : 'Vehicle Rent'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleRent}
                    onChange={(e) => setVehicleRent(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800"
                  />
                </div>

                {/* Snacks */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'নাস্তা খরচ (Snacks)' : 'Snacks Cost'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={snacksCost}
                    onChange={(e) => setSnacksCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800"
                  />
                </div>

                {/* Commission Adjustment (+/-) */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'কমিশন কম/বেশি (±)' : 'Commission Adj (±)'}
                  </label>
                  <input
                    type="number"
                    value={commissionAdjustment}
                    onChange={(e) => setCommissionAdjustment(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800"
                    title="বাড়তি কমিশন খরচ হলে পজিটিভ (+), কমিশন কম দিলে নেগেটিভ (-)"
                  />
                </div>

                {/* Labour Cost */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'লেবার / লোডিং' : 'Labour Cost'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={labourCost}
                    onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800"
                  />
                </div>

                {/* Other Expenses */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'অন্যান্য বিবিধ খরচ' : 'Other Expenses'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherExpenses}
                    onChange={(e) => setOtherExpenses(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800"
                  />
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'গাড়ি / ভ্যান নম্বর' : 'Vehicle No.'}
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="বগুড়া-থ-১১২৪"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              {/* Expense & Cash Deposit Reconciliation Ribbon */}
              <div className="p-3 bg-white rounded-lg border border-amber-300 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-blue-950 font-medium">
                  <span>ফেরত ও ড্যামেজ বাদে বিক্রয়:</span>
                  <span className="font-mono-num font-bold text-blue-900 text-sm">
                    {formatCurrency(netSalesAfterDamageReturn, lang)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-amber-950 font-medium">
                  <span>মোট ফিল্ড খরচ:</span>
                  <span className="font-mono-num font-bold text-red-700 text-sm">
                    - {formatCurrency(totalFieldExpenses, lang)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 border border-emerald-300 rounded-md text-emerald-950 font-bold">
                  <span>অফিসে জমাযোগ্য নিট ক্যাশ:</span>
                  <span className="font-mono-num text-emerald-900 text-base">
                    {formatCurrency(officeCashToDeposit, lang)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SR Invoice Footer Summary (Requirement 7) */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {lang === 'bn' ? 'চালান মন্তব্য / এস.আর ডায়েরি নোট' : 'S.R Notes'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'bn' ? 'মার্কেট রুট পরিস্থিতি বা মন্তব্য...' : 'Market observations...'}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                {lang === 'bn' ? '📊 চালানের হিসাব ও অফিস ক্যাশ সমন্বয়' : '📊 Challan & Office Cash Reconciliation'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {formatNumber(totalCartons, lang)} {lang === 'bn' ? 'কার্টুন' : 'Ctn'} + {formatNumber(totalPieces, lang)} {lang === 'bn' ? 'পিস' : 'Pcs'}
              </span>
            </div>

            {/* (+) ধাপ ১: মোট বিক্রি */}
            <div className="flex justify-between text-xs text-slate-700">
              <span className="font-medium">
                {lang === 'bn' ? '১. (+) মোট বিক্রিত পণ্যের টাকা (Gross Sales):' : '1. (+) Total Sales Value:'}
              </span>
              <span className="font-mono-num font-bold text-slate-900">
                {formatCurrency(totalSalesAmount, lang)}
              </span>
            </div>

            {/* (-) ধাপ ২: ফেরত ও ড্যামেজ সমন্বয় */}
            <div className="pl-2 border-l-2 border-amber-300 space-y-1">
              <div className="flex justify-between text-xs text-amber-800">
                <span className="font-medium">
                  {lang === 'bn' ? `(-) ফেরত পণ্য সমন্বয় (${formatNumber(totalReturnPieces, lang)} পিস):` : `(-) Return Deduct (${totalReturnPieces} pcs):`}
                </span>
                <span className="font-mono-num font-bold">
                  - {formatCurrency(totalReturnAmount, lang)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-red-600">
                <span className="font-medium">
                  {lang === 'bn' ? `(-) ড্যামেজ মাল সমন্বয় (${formatNumber(totalDamagePieces, lang)} পিস):` : `(-) Damage Deduct (${totalDamagePieces} pcs):`}
                </span>
                <span className="font-mono-num font-bold">
                  - {formatCurrency(totalDamageAmount, lang)}
                </span>
              </div>
            </div>

            {/* (=) ফেরত ও ড্যামেজ বাদে প্রকৃত বিক্রয় */}
            <div className="flex justify-between text-xs font-bold text-blue-900 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
              <span>{lang === 'bn' ? '২. (=) ফেরত ও ড্যামেজ বাদে প্রকৃত বিক্রয় (মার্কেট কালেকশন):' : '2. (=) Net Sales after Return & Damage:'}</span>
              <span className="font-mono-num text-sm">{formatCurrency(netSalesAfterDamageReturn, lang)}</span>
            </div>

            {/* (-) ধাপ ৩: ফিল্ডের সকল খরচ বাদ */}
            <div className="flex justify-between text-xs text-rose-700">
              <span className="font-medium">
                {lang === 'bn' ? '৩. (-) ফিল্ডের সকল খরচ (ভাড়া, নাস্তা, কমিশন, লেবার):' : '3. (-) Total Field Expenses:'}
              </span>
              <span className="font-mono-num font-bold">
                - {formatCurrency(totalFieldExpenses, lang)}
              </span>
            </div>

            {/* (=) ধাপ ৪: অফিসে জমাযোগ্য নিট ক্যাশ */}
            <div className="border-t-2 border-emerald-400 pt-2 flex justify-between text-sm font-bold text-slate-900 bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-300">
              <div className="flex flex-col">
                <span className="text-emerald-950 font-bold">
                  {lang === 'bn' ? '৪. (=) অফিসে জমাযোগ্য নিট ক্যাশ (Office Cash):' : '4. (=) Net Office Cash to Deposit:'}
                </span>
                <span className="text-[10px] text-emerald-800 font-normal">
                  {lang === 'bn' ? '(প্রকৃত বিক্রয় থেকে ফিল্ড খরচ বাদ দিয়ে হিসাব)' : '(Net Sales minus Field Expenses)'}
                </span>
              </div>
              <span className="font-mono-num text-emerald-950 text-base">{formatCurrency(officeCashToDeposit, lang)}</span>
            </div>

            {/* ধাপ ৫: অফিস ক্যাশ মিলানো (Paid & Due) */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {lang === 'bn' ? '৫. (-) অফিসে প্রকৃত জমা ক্যাশ' : '5. (-) Office Cash Deposited'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(officeCashToDeposit)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
                      title="অফিস ক্যাশ মিলিয়ে বকেয়া ০ করুন"
                    >
                      ⚡ {lang === 'bn' ? 'অফিস ক্যাশ মিলান (০)' : 'Match Cash (0)'}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full py-1.5 px-2 text-xs font-mono-num font-bold bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? '(=) অফিস ক্যাশ পার্থক্য / বকেয়া' : '(=) Cash Balance / Due'}
                  </label>
                  <div
                    className={`py-1.5 px-2 text-xs font-mono-num font-bold rounded-md flex items-center justify-between border ${
                      isZeroDue
                        ? 'bg-emerald-100/90 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <span>{formatCurrency(dueAmount, lang)}</span>
                    {isZeroDue && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-700 text-white rounded">
                        ✓ {lang === 'bn' ? 'অফিস ক্যাশ মিলেছে (০)' : 'Matched (0)'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {printModalInvoice && (
        <PrintableInvoiceModal
          invoice={printModalInvoice}
          lang={lang}
          onClose={() => setPrintModalInvoice(null)}
        />
      )}
    </div>
  );
};
