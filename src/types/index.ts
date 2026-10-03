export type BulkPackagingUnit = 'কার্টুন' | 'বস্তা' | 'কেস' | 'ড্রাম' | 'পেটি' | 'Carton' | 'Sack' | 'Case' | string;
export type BaseMeasurementUnit = 'পিস' | 'কেজি' | 'লিটার' | 'গ্রাম' | 'Piece' | 'Kg' | 'Liter' | 'Gram' | string;

export interface Product {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  category: string;
  bulkUnit: BulkPackagingUnit; // e.g. 'কার্টুন' or 'বস্তা'
  baseUnit: BaseMeasurementUnit; // e.g. 'পিস' or 'কেজি' or 'লিটার'
  piecesPerCarton: number; // units per bulk (e.g. 12, 24, 48, 50)
  tradePrice: number; // T.P per base unit (পিস/কেজি/লিটার)
  defaultMarginPercent: number; // Dealer discount %
  dealerPrice: number; // D.P - ডিলার রেট প্রতি পিস/কেজি/লিটার
  srMarginPercent: number; // S.R discount %
  srPrice: number; // এস.আর রেট প্রতি পিস/কেজি/লিটার (Separate S.R Field Rate!)
  mrp: number; // Maximum Retail Price
  minStockLevel: number; // in base units
  openingStock: number; // in base units
  currentStock: number; // in base units
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Dealer {
  id: string;
  code: string;
  name: string;
  proprietor?: string;
  mobile: string;
  address: string;
  areaRoute: string;
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ProductTarget {
  productId: string;
  targetPieces: number;
}

export interface SalesRepresentative {
  id: string;
  srCode: string;
  name: string;
  mobile: string;
  areaRoute: string;
  joiningDate: string;
  monthlyTarget: number; // in BDT
  productTargets?: Record<string, number>; // productId -> target pieces
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  productNameBn: string;
  bulkUnit?: BulkPackagingUnit; // কার্টুন / বস্তা
  baseUnit?: BaseMeasurementUnit; // পিস / কেজি / লিটার
  piecesPerCarton: number;
  cartonQty: number; // Bulk quantity (Carton / Sack)
  pieceQty: number; // Loose base units (Piece / Kg / Liter)
  totalPieces: number; // cartonQty * piecesPerCarton + pieceQty
  tp: number; // Trade Price per base unit
  tpPerCarton: number; // tp * piecesPerCarton
  discountPercent: number; // %
  dp: number; // Applied Price (Dealer Price or SR Price) per base unit
  dpPerCarton: number; // dp * piecesPerCarton
  lineTotal: number; // totalPieces * dp
  // S.R specific damage & return fields
  damageCarton?: number;
  damagePiece?: number;
  damageTotalPieces?: number;
  damageAmount?: number; // কতো টাকার মাল ডেমেজ
  returnCarton?: number;
  returnPiece?: number;
  returnTotalPieces?: number;
  returnAmount?: number; // কতো টাকার প্রডাক্ট ফেরত
  netSoldPieces?: number; // totalPieces - (damageTotalPieces + returnTotalPieces)
  netLineTotal?: number; // netSoldPieces * dp
}

export interface DeliveryExpenseBreakdown {
  vehicleRent: number; // গাড়ি ভাড়া
  snacksCost: number; // নাস্তা ও আপ্যায়ন
  commissionAdjustment: number; // কমিশন কম (-) / বেশি (+)
  labourCost: number; // লেবার / লোডিং-আনলোডিং
  otherExpenses: number; // অন্যান্য বিবিধ খরচ
  totalExpenses: number; // সর্বমোট ডেলিভারি ও ফিল্ড খরচ
  netCashCollected: number; // ক্যাশ জমা / নিট প্রাপ্তি = (paidAmount - totalExpenses)
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'dealer' | 'sr';
  date: string;
  dealerId?: string;
  dealerName?: string;
  srId?: string;
  srName?: string;
  route?: string;
  vehicleNumber?: string; // গাড়ি নম্বর / ভ্যান
  items: InvoiceItem[];
  totalCartons: number;
  totalPieces: number;
  totalGrossAmount: number;
  totalDiscount: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  // Field Expenses in Invoice (গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি)
  expenses?: DeliveryExpenseBreakdown;
  notes?: string;
  totalDamagePieces?: number;
  totalReturnPieces?: number;
  totalDamageAmount?: number; // কতো টাকার মাল ড্যামেজ আসল
  totalReturnAmount?: number; // কতো টাকার প্রডাক্ট ফেরত আসল
  netActualSalesAmount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseSheetEntry {
  id: string;
  date: string;
  srId?: string;
  srName?: string;
  dealerId?: string;
  dealerName?: string;
  route?: string;
  invoiceNumber?: string;
  vehicleNumber?: string; // গাড়ি নম্বর / সিএনজি / ভ্যান
  vehicleRent: number; // গাড়ি ভাড়া
  snacksCost: number; // নাস্তা খরচ
  commissionAdjustment: number; // কমিশন কম/বেশি (±)
  labourCost: number; // লেবার খরচ
  otherExpenses: number; // অন্যান্য খরচ
  totalExpense: number; // মোট খরচ
  salesCollection: number; // সেলস কালেকশন
  netCashDeposit: number; // ক্যাশ জমা = (salesCollection - totalExpense)
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  productNameBn: string;
  bulkUnit?: BulkPackagingUnit;
  baseUnit?: BaseMeasurementUnit;
  piecesPerCarton: number;
  cartonQty: number;
  pieceQty: number;
  totalPieces: number;
  purchasePricePerPiece: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  date: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCartons: number;
  totalPieces: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface DamageRecord {
  id: string;
  date: string;
  invoiceId?: string;
  srId?: string;
  srName?: string;
  dealerId?: string;
  dealerName?: string;
  productId: string;
  productName: string;
  bulkUnit?: BulkPackagingUnit;
  baseUnit?: BaseMeasurementUnit;
  cartonQty: number;
  pieceQty: number;
  totalPieces: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface ReturnRecord {
  id: string;
  date: string;
  invoiceId?: string;
  srId?: string;
  srName?: string;
  dealerId?: string;
  dealerName?: string;
  productId: string;
  productName: string;
  bulkUnit?: BulkPackagingUnit;
  baseUnit?: BaseMeasurementUnit;
  cartonQty: number;
  pieceQty: number;
  totalPieces: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'add' | 'subtract';
  cartonQty: number;
  pieceQty: number;
  totalPieces: number;
  reason: string;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  companyNameBn: string;
  tagline: string;
  taglineBn: string;
  logoUrl?: string;
  address: string;
  addressBn: string;
  phone: string;
  email: string;
  website: string;
  chairmanName: string;
  chairmanNameBn: string;
  chairmanDesignation: string;
  chairmanDesignationBn: string;
  invoiceFooterNote: string;
  invoiceFooterNoteBn: string;
  invoicePrefix: string;
  defaultDiscountPercent: number;
  defaultSrDiscountPercent: number;
  currencySymbol: string;
}

export interface FeatureLocks {
  dealerInvoice: boolean;
  srInvoice: boolean;
  stock: boolean;
  purchase: boolean;
  damageReturn: boolean;
  expenses: boolean; // খরচ শিট লক
  srTarget: boolean;
  reports: boolean;
  backupRestore: boolean;
  settings: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'superadmin' | 'admin' | 'manager';
  lastLogin?: string;
}

export type AppLanguage = 'bn' | 'en';
