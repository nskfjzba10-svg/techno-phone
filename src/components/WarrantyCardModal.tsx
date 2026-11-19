import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Printer,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import { buildWarrantyQrData, formatCurrency } from '../data/catalog';
import { TrackingRecord } from '../types';

interface WarrantyCardModalProps {
  record: TrackingRecord | null;
  onClose: () => void;
}

export const WarrantyCardModal: React.FC<WarrantyCardModalProps> = ({
  record,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record) {
      setQrDataUrl('');
      return;
    }
    const payload =
      record.warrantyQrCodeData ||
      buildWarrantyQrData({
        id: record.id,
        storeName: record.storeName,
        customerName: record.customerName,
        title: record.title,
        warrantyLabel: record.warrantyLabel,
        createdAt: record.createdAt,
      });

    let active = true;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, onClose]);

  if (!record) return null;

  const handleCopyTicket = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(record.id).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="بطاقة الضمان الإلكترونية والفاتورة"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              بطاقة الضمان الإلكترونية والفاتورة
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق بطاقة الضمان"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Official Header Strip */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-5 flex items-center justify-between gap-4 border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-blue-300 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>ضمان موثّق عبر منصة تكنو فون — العراق</span>
              </div>
              <div className="font-display text-lg font-extrabold">
                {record.storeName}
              </div>
              <div className="text-xs text-slate-300 font-mono tabular-nums">
                رقم الفاتورة / التذكرة: {record.id}
              </div>
            </div>
            <div className="bg-white p-2 rounded-xl shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`رمز QR لبطاقة ضمان ${record.id}`}
                  className="w-24 h-24 block"
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center text-xs text-slate-500">
                  QR
                </div>
              )}
            </div>
          </div>

          {/* Invoice & Warranty Details */}
          <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm bg-[#F8F9FA] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4">
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">اسم الزبون</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100 text-left">
                {record.customerName}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">الجهاز / الخدمة</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100 text-left">
                {record.title}
              </dd>
            </div>
            {record.imei && (
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">رقم IMEI</dt>
                <dd
                  dir="ltr"
                  className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums"
                >
                  {record.imei}
                </dd>
              </div>
            )}
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">تغطية الضمان</dt>
              <dd className="font-semibold text-emerald-700 dark:text-emerald-400 text-left">
                {record.warrantyLabel}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">تاريخ الإصدار</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                {record.createdAt}
              </dd>
            </div>
            {record.assignedTechnician && (
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">الفني المسؤول</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">
                  {record.assignedTechnician}
                </dd>
              </div>
            )}
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">المبلغ الإجمالي</dt>
              <dd className="font-bold text-base text-blue-700 dark:text-blue-400 tabular-nums">
                {formatCurrency(record.totalPrice)}
              </dd>
            </div>
          </dl>

          {record.technicianReport && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
              <strong className="block mb-1">التقرير الفني المعتمد:</strong>
              {record.technicianReport}
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">
            تبقى هذه البطاقة محفوظة في حسابك؛ أبرز رمز QR للمتجر للتحقق الفوري خلال فترة الضمان.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyTicket}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[42px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تم نسخ الرقم</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ رقم التذكرة</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer min-h-[42px]"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
