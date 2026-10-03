import React, { useState } from 'react';
import { db, getTodayDateString } from '../../db/storage';
import { AppLanguage, Dealer, Invoice, InvoiceItem } from '../../types';
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
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Calendar,
  Hash,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';

interface Props {
  lang: AppLanguage;
  onInvoiceSaved?: (invoiceId: string) => void;
  editingInvoice?: Invoice | null;
  onCancelEdit?: () => void;
}

export const DealerInvoiceMaker: React.FC<Props> = ({
  lang,
  onInvoiceSaved,
  editingInvoice,
  onCancelEdit,
}) => {
  const products = db.getProducts();
  const dealers = db.getDealers();
  const settings = db.getSettings();

  const [date, setDate] = useState(editingInvoice?.date || getTodayDateString());
  const [invoiceNumber] = useState(
    editingInvoice?.invoiceNumber || db.generateNextInvoiceNumber('dealer')
  );
  const [selectedDealerId, setSelectedDealerId] = useState<string>(
    editingInvoice?.dealerId || (dealers.length > 0 ? dealers[0].id : '')
  );
  const [notes, setNotes] = useState(editingInvoice?.notes || '');
  const [paidAmount, setPaidAmount] = useState<number>(editingInvoice?.paidAmount || 0);

  // Delivery & Field Expenses State for Dealer Invoice
  const [showExpenses, setShowExpenses] = useState<boolean>(true);
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
  const [vehicleNumber, setVehicleNumber] = useState<string>(
    editingInvoice?.vehicleNumber || ''
  );

  // Recalculate a single item row with accurate carton, piece, discount %, return and damage values
  const recalcRow = (item: InvoiceItem): InvoiceItem => {
    const totalPieces = item.cartonQty * item.piecesPerCarton + item.pieceQty;
    const dp =
      item.discountPercent > 0
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

  // Initialize items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (editingInvoice && editingInvoice.items.length > 0) {
      return editingInvoice.items.map(recalcRow);
    }
    // Default 1 blank row with first product
    if (products.length > 0) {
      const p = products[0];
      const dp = p.dealerPrice || p.tradePrice;
      return [
        recalcRow({
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
          discountPercent: 0, // ALWAYS default to 0% as requested!
          dp: Number(dp.toFixed(2)),
          dpPerCarton: Number((dp * p.piecesPerCarton).toFixed(2)),
          lineTotal: Number((p.piecesPerCarton * dp).toFixed(2)),
          damageCarton: 0,
          damagePiece: 0,
          damageTotalPieces: 0,
          damageAmount: 0,
          returnCarton: 0,
          returnPiece: 0,
          returnTotalPieces: 0,
          returnAmount: 0,
          netSoldPieces: p.piecesPerCarton,
          netLineTotal: Number((p.piecesPerCarton * dp).toFixed(2)),
        }),
      ];
    }
    return [];
  });

  const [printModalInvoice, setPrintModalInvoice] = useState<Invoice | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const selectedDealer: Dealer | undefined = dealers.find((d) => d.id === selectedDealerId);

  // Handlers for Row edits
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
      item.discountPercent = item.discountPercent || 0;

      const dp = item.discountPercent > 0
        ? prod.tradePrice - (prod.tradePrice * item.discountPercent) / 100
        : (prod.dealerPrice || prod.tradePrice);
      item.dp = Number(dp.toFixed(2));
      item.dpPerCarton = Number((dp * prod.piecesPerCarton).toFixed(2));

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

  const handleDiscountChange = (index: number, percent: number) => {
    const discount = Math.max(0, Math.min(100, percent || 0));
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.discountPercent = discount;
      const dp = item.tp - (item.tp * discount) / 100;
      item.dp = Number(dp.toFixed(2));
      item.dpPerCarton = Number((dp * item.piecesPerCarton).toFixed(2));
      copy[index] = recalcRow(item);
      return copy;
    });
  };

  const handleDPChange = (index: number, manualDP: number) => {
    const dp = Math.max(0, manualDP || 0);
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.dp = Number(dp.toFixed(2));
      item.dpPerCarton = Number((dp * item.piecesPerCarton).toFixed(2));
      // Back calculate discount percent
      if (item.tp > 0) {
        const disc = ((item.tp - dp) / item.tp) * 100;
        item.discountPercent = Number(disc.toFixed(2));
      }
      copy[index] = recalcRow(item);
      return copy;
    });
  };

  const handleAddRow = (forDamageOrReturnOnly: boolean = false) => {
    if (products.length === 0) return;
    const p = products[0];
    const dp = p.dealerPrice || p.tradePrice;

    setItems((prev) => [
      ...prev,
      recalcRow({
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
        dp: Number(dp.toFixed(2)),
        dpPerCarton: Number((dp * p.piecesPerCarton).toFixed(2)),
        lineTotal: forDamageOrReturnOnly ? 0 : Number((p.piecesPerCarton * dp).toFixed(2)),
        damageCarton: 0,
        damagePiece: 0,
        damageTotalPieces: 0,
        damageAmount: 0,
        returnCarton: 0,
        returnPiece: 0,
        returnTotalPieces: 0,
        returnAmount: 0,
        netSoldPieces: forDamageOrReturnOnly ? 0 : p.piecesPerCarton,
        netLineTotal: forDamageOrReturnOnly ? 0 : Number((p.piecesPerCarton * dp).toFixed(2)),
      }),
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const totalCartons = items.reduce((sum, item) => sum + item.cartonQty, 0);
  const totalPieces = items.reduce((sum, item) => sum + item.totalPieces, 0);
  const totalGrossAmount = Number(
    items.reduce((sum, item) => sum + item.totalPieces * item.tp, 0).toFixed(2)
  );

  // ধাপ ১: মোট পণ্যের বিক্রয় মূল্য (Gross Sales at DP)
  const totalSalesAmount = Number(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );
  const totalDiscount = Number((totalGrossAmount - totalSalesAmount).toFixed(2));

  // ধাপ ২: মোট বিক্রি থেকে ফেরত ও ড্যামেজ সমন্বয়
  const totalReturnPieces = items.reduce(
    (sum, item) => sum + (item.returnTotalPieces || 0),
    0
  );
  const totalReturnAmount = Number(
    items
      .reduce((sum, item) => sum + (item.returnAmount || (item.returnTotalPieces || 0) * item.dp), 0)
      .toFixed(2)
  );

  const totalDamagePieces = items.reduce(
    (sum, item) => sum + (item.damageTotalPieces || 0),
    0
  );
  const totalDamageAmount = Number(
    items
      .reduce((sum, item) => sum + (item.damageAmount || (item.damageTotalPieces || 0) * item.dp), 0)
      .toFixed(2)
  );

  // ফেরত ও ড্যামেজ সমন্বয়ের পর প্রকৃত বিক্রয় (মার্কেট সেলস কালেকশন)
  const netSalesAfterDamageReturn = Number(
    Math.max(0, totalSalesAmount - totalReturnAmount - totalDamageAmount).toFixed(2)
  );

  // ধাপ ৩: ফিল্ড ও ডেলিভারির সকল খরচ (পরিবহন/গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি, লেবার, অন্যান্য)
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

  // Build Invoice Object
  const buildInvoice = (): Invoice => {
    return {
      id: editingInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber,
      invoiceType: 'dealer',
      date,
      dealerId: selectedDealer?.id,
      dealerName: selectedDealer?.name,
      route: selectedDealer?.areaRoute,
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

  // Save handler
  const handleSave = (andPrint: boolean = false) => {
    if (items.length === 0) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে অন্তত একটি পণ্য যোগ করুন।' : 'Please add at least one product.');
      return;
    }

    // Check stock warnings
    let warning = '';
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && item.totalPieces > prod.currentStock) {
        warning += `${prod.nameBn || prod.name}: বর্তমান মজুদ আছে ${prod.currentStock} পিস, চালানে দেয়া হয়েছে ${item.totalPieces} পিস। `;
      }
    }
    if (warning) {
      setStockWarning(warning);
    } else {
      setStockWarning(null);
    }

    const invoice = buildInvoice();
    db.saveInvoice(invoice, editingInvoice);

    // Also sync to Delivery & Field Expense Sheet if expenses recorded
    if (totalFieldExpenses > 0) {
      db.saveExpenseEntry({
        id: `exp-dlr-${invoice.id}`,
        date: invoice.date,
        dealerId: selectedDealer?.id,
        dealerName: selectedDealer?.name,
        route: selectedDealer?.areaRoute,
        invoiceNumber: invoice.invoiceNumber,
        vehicleNumber: vehicleNumber || 'ডেলিভারি পিকআপ / ভ্যান',
        vehicleRent,
        snacksCost,
        commissionAdjustment,
        labourCost,
        otherExpenses,
        totalExpense: totalFieldExpenses,
        salesCollection: netSalesAfterDamageReturn,
        netCashDeposit: officeCashToDeposit,
        notes: `ডিলার চালান ${invoice.invoiceNumber}-এর ডেলিভারি ও ফিল্ড খরচ`,
        createdAt: new Date().toISOString(),
      });
    }

    setSaveSuccessMsg(
      lang === 'bn'
        ? `চালান ${invoice.invoiceNumber} সফলভাবে সংরক্ষিত হয়েছে এবং অফিস ক্যাশ সমন্বয় সম্পন্ন হয়েছে!`
        : `Invoice ${invoice.invoiceNumber} saved successfully and office cash reconciled!`
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
      {/* Header & Controls */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {editingInvoice
                  ? lang === 'bn'
                    ? 'ডিলার চালান সংশোধন (Edit Invoice)'
                    : 'Edit Dealer Invoice'
                  : lang === 'bn'
                  ? 'নতুন ডিলার চালান তৈরি (New Dealer Invoice)'
                  : 'Create Dealer Invoice'}
              </h1>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'কার্টুন, পিস, টি.পি, ডিলার রেট, ফেরত-ড্যামেজ সমন্বয়, ডেলিভারি খরচ ও অফিস ক্যাশ মিলানো'
                  : 'Automated Dealer Pricing, Returns, Damage, Field Expenses and Office Cash Balance'}
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
              <span>{lang === 'bn' ? 'চালান সংরক্ষণ করুন' : 'Save Invoice'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'bn' ? 'সংরক্ষণ ও প্রিন্ট (A4)' : 'Save & Print A4'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Stock Warning Alert */}
        {stockWarning && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{lang === 'bn' ? 'সতর্কতা: মজুদের চেয়ে বেশি পরিমাণ দেওয়া হয়েছে' : 'Warning: Quantity exceeds current stock'}</p>
              <p>{stockWarning}</p>
            </div>
          </div>
        )}

        {/* Top Meta Form */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Dealer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'bn' ? 'ডিলার নির্বাচন করুন' : 'Select Dealer'}</span>
            </label>
            <select
              value={selectedDealerId}
              onChange={(e) => setSelectedDealerId(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            >
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.proprietor ? `(${d.proprietor})` : ''} - {d.areaRoute}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'bn' ? 'চালানের তারিখ' : 'Invoice Date'}</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            >
            </input>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'bn' ? 'চালান নম্বর' : 'Invoice No.'}</span>
            </label>
            <input
              type="text"
              readOnly
              value={invoiceNumber}
              className="w-full p-2 text-xs bg-slate-100 font-mono text-slate-700 border border-slate-300 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Route / Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'bn' ? 'ডেলিভারি রুট / এলাকা' : 'Route / Area'}</span>
            </label>
            <input
              type="text"
              readOnly
              value={selectedDealer?.areaRoute || 'N/A'}
              className="w-full p-2 text-xs bg-slate-100 text-slate-700 border border-slate-300 rounded-lg cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {lang === 'bn' ? 'চালান পণ্যের তালিকা, ডিলার রেট ও ফেরত/ড্যামেজ' : 'Invoice Products, Dealer Rates & Deductions'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {lang === 'bn'
                ? 'কার্টুন, পিস, টি.পি ও কমিশন % এন্ট্রি করুন। কোনো পণ্য ফেরত বা ড্যামেজ থাকলে তা স্বয়ংক্রিয়ভাবে মোট বিক্রি থেকে বাদ যাবে।'
                : 'Enter Carton, Piece, TP & Discount %. Returns and Damage will deduct from sales.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRow(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ নতুন পণ্য যোগ' : '+ Add Product'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRow(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-300 transition"
              title="নতুন বিক্রি ছাড়া শুধু ফেরত বা ড্যামেজ পণ্য যোগ করতে"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'bn' ? '+ ফেরত/ড্যামেজ আইটেম' : '+ Damage/Return Item'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-2 text-center w-10">ক্রমিক</th>
                <th className="py-2.5 px-3 min-w-[200px]">Product Name (একক ও বিবরণ)</th>
                <th className="py-2.5 px-2 text-center w-20">কার্টুন</th>
                <th className="py-2.5 px-2 text-center w-20">পিস</th>
                <th className="py-2.5 px-2 text-center w-20 bg-slate-50">মোট পিস</th>
                <th className="py-2.5 px-2 text-right w-20">T.P (টাকা)</th>
                <th className="py-2.5 px-2 text-center w-16">ছাড় %</th>
                <th className="py-2.5 px-2 text-right w-24 bg-emerald-50/50 font-bold text-emerald-900">ডিলার রেট</th>
                <th className="py-2.5 px-2 text-right w-24 bg-slate-50 font-bold text-slate-800">মোট বিক্রি</th>
                <th className="py-2.5 px-2 text-center w-20 bg-amber-50/60 text-amber-900">ফেরত পিস</th>
                <th className="py-2.5 px-2 text-center w-20 bg-red-50/60 text-red-900">ড্যামেজ পিস</th>
                <th className="py-2.5 px-3 text-right w-28 bg-emerald-100/50 font-bold text-emerald-950">নিট বিক্রি</th>
                <th className="py-2.5 px-2 text-center w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const currentStock = prod?.currentStock ?? 0;
                const isStockLow = item.totalPieces > currentStock;
                const bUnit = item.bulkUnit || prod?.bulkUnit || 'কার্টুন';
                const sUnit = item.baseUnit || prod?.baseUnit || 'পিস';
                const isZeroSalesRow = item.totalPieces === 0 && ((item.damagePiece || 0) > 0 || (item.returnPiece || 0) > 0);

                return (
                  <tr key={idx} className={`hover:bg-slate-50/60 transition ${isZeroSalesRow ? 'bg-amber-50/30' : ''}`}>
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
                            {p.nameBn || p.name} (১{p.bulkUnit || 'কার্টুন'} = {p.piecesPerCarton} {p.baseUnit || 'পিস'} | D.P: ৳{p.dealerPrice})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-0.5">
                        <span>১ {bUnit} = {item.piecesPerCarton} {sUnit}</span>
                        <span className={isStockLow ? 'text-red-600 font-bold' : 'text-slate-500'}>
                          মজুদ: {formatNumber(currentStock, lang)} {sUnit} {isStockLow && '⚠ ঘাটতি!'}
                        </span>
                      </div>
                    </td>

                    {/* Carton / Bulk Qty */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.cartonQty}
                        onChange={(e) => handleQtyChange(idx, 'cartonQty', parseInt(e.target.value, 10))}
                        className="w-full text-center py-1.5 px-1 font-mono-num font-semibold bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600"
                      />
                    </td>

                    {/* Loose Piece Qty */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.pieceQty}
                        onChange={(e) => handleQtyChange(idx, 'pieceQty', parseInt(e.target.value, 10))}
                        className="w-full text-center py-1.5 px-1 font-mono-num font-semibold bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600"
                      />
                    </td>

                    {/* Total Pieces (Calculated) */}
                    <td className="py-2 px-2 text-center bg-slate-50 font-mono-num font-bold text-slate-800">
                      {formatNumber(item.totalPieces, lang)}
                    </td>

                    {/* Trade Price (T.P) */}
                    <td className="py-2 px-2 text-right font-mono-num text-slate-700">
                      {formatNumber(item.tp, lang)}
                    </td>

                    {/* Margin/Discount % */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={item.discountPercent}
                        onChange={(e) => handleDiscountChange(idx, parseFloat(e.target.value))}
                        className="w-full text-center py-1.5 px-1 font-mono-num font-medium bg-white border border-slate-300 rounded-md text-emerald-800 focus:ring-1 focus:ring-emerald-600"
                      />
                    </td>

                    {/* Dealer Price (D.P) */}
                    <td className="py-2 px-2 text-right bg-emerald-50/40">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.dp}
                        onChange={(e) => handleDPChange(idx, parseFloat(e.target.value))}
                        className="w-full text-right py-1.5 px-2 font-mono-num font-bold text-emerald-900 bg-white border border-emerald-300 rounded-md focus:ring-1 focus:ring-emerald-600"
                      />
                    </td>

                    {/* Row Line Total */}
                    <td className="py-2 px-2 text-right bg-slate-50 font-mono-num font-bold text-slate-900">
                      {formatCurrency(item.lineTotal, lang)}
                    </td>

                    {/* Return Piece Input */}
                    <td className="py-2 px-2 text-center bg-amber-50/40">
                      <input
                        type="number"
                        min="0"
                        value={item.returnPiece || 0}
                        onChange={(e) => handleQtyChange(idx, 'returnPiece', parseInt(e.target.value, 10))}
                        placeholder="0"
                        className="w-full text-center py-1 px-1 font-mono-num font-semibold text-amber-900 bg-white border border-amber-300 rounded-md focus:ring-1 focus:ring-amber-500"
                      />
                      {(item.returnAmount || 0) > 0 && (
                        <span className="block text-[9px] font-bold text-amber-700 mt-0.5">
                          -৳{item.returnAmount}
                        </span>
                      )}
                    </td>

                    {/* Damage Piece Input */}
                    <td className="py-2 px-2 text-center bg-red-50/40">
                      <input
                        type="number"
                        min="0"
                        value={item.damagePiece || 0}
                        onChange={(e) => handleQtyChange(idx, 'damagePiece', parseInt(e.target.value, 10))}
                        placeholder="0"
                        className="w-full text-center py-1 px-1 font-mono-num font-semibold text-red-900 bg-white border border-red-300 rounded-md focus:ring-1 focus:ring-red-500"
                      />
                      {(item.damageAmount || 0) > 0 && (
                        <span className="block text-[9px] font-bold text-red-600 mt-0.5">
                          -৳{item.damageAmount}
                        </span>
                      )}
                    </td>

                    {/* Net Line Total */}
                    <td className="py-2 px-3 text-right bg-emerald-100/40 font-mono-num font-bold text-emerald-950 text-xs">
                      {formatCurrency(item.netLineTotal || 0, lang)}
                      <span className="block text-[9px] text-slate-500 font-normal">
                        ({formatNumber(item.netSoldPieces || 0, lang)} {sUnit})
                      </span>
                    </td>

                    {/* Delete Row Button */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md"
                        title="Remove row"
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

        {/* Section: ডেলিভারি ও ফিল্ড খরচ (Delivery & Field Expenses Breakdown) */}
        <div className="mt-5 border border-amber-300 bg-amber-50/40 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-950">
                  {lang === 'bn' ? 'ডেলিভারি ও ফিল্ড খরচের হিসাব' : 'Delivery & Field Expenses Breakdown'}
                </h3>
                <p className="text-[11px] text-amber-800">
                  {lang === 'bn'
                    ? 'গাড়ি ভাড়া, নাস্তা, কমিশন ও লেবার খরচ মোট বিক্রি (ফেরত-ড্যামেজ বাদে) থেকে বাদ দিয়ে অফিস ক্যাশ মিলানো হবে।'
                    : 'Field costs will be deducted from sales after returns & damage to reconcile office cash.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExpenses(!showExpenses)}
              className="text-xs font-semibold text-amber-900 hover:underline"
            >
              {showExpenses ? (lang === 'bn' ? 'সংকোচন করুন' : 'Collapse') : (lang === 'bn' ? 'বিস্তারিত দেখুন' : 'Expand')}
            </button>
          </div>

          {showExpenses && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {/* Vehicle Rent */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'গাড়ি ভাড়া / পরিবহন' : 'Vehicle Rent'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleRent}
                    onChange={(e) => setVehicleRent(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Snacks */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'নাস্তা ও আপ্যায়ন' : 'Snacks'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={snacksCost}
                    onChange={(e) => setSnacksCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Commission Adjustment */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                    {lang === 'bn' ? 'কমিশন কম/বেশি (±)' : 'Commission Adj (±)'}
                  </label>
                  <input
                    type="number"
                    value={commissionAdjustment}
                    onChange={(e) => setCommissionAdjustment(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
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
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
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
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono-num font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
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
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500"
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
                  <span>মোট ফিল্ড ও ডেলিভারি খরচ:</span>
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

        {/* Invoice Bottom Calculations & Office Cash Reconciliation */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          {/* Notes & Terms */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {lang === 'bn' ? 'চালান নোট / বিশেষ নির্দেশনা' : 'Invoice Notes'}
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'bn' ? 'ডেলিভারি বা পেমেন্ট শর্তাবলী লিখুন...' : 'Delivery or payment terms...'}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Real-time Reconciliation Box */}
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
                {lang === 'bn' ? '১. (+) মোট পণ্যের বিক্রয় মূল্য (Gross Sales):' : '1. (+) Total Sales Value:'}
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
              <span>{lang === 'bn' ? '২. (=) ফেরত ও ড্যামেজ বাদে প্রকৃত বিক্রয় (কালেকশন):' : '2. (=) Net Sales after Return & Damage:'}</span>
              <span className="font-mono-num text-sm">{formatCurrency(netSalesAfterDamageReturn, lang)}</span>
            </div>

            {/* (-) ধাপ ৩: ফিল্ডের সকল খরচ বাদ */}
            <div className="flex justify-between text-xs text-rose-700">
              <span className="font-medium">
                {lang === 'bn' ? '৩. (-) ডেলিভারি ও ফিল্ড খরচ (ভাড়া, নাস্তা, কমিশন, লেবার):' : '3. (-) Delivery & Field Expenses:'}
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
                  {lang === 'bn' ? '(প্রকৃত বিক্রয় থেকে ফিল্ড খরচ বাদ দিয়ে চূড়ান্ত হিসাব)' : '(Net Sales minus Field Expenses)'}
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

      {/* Printable Modal */}
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
