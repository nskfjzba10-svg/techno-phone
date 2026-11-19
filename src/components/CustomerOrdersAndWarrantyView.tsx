import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Star,
  Wrench,
} from 'lucide-react';
import { formatCurrency } from '../data/catalog';
import {
  AuthUser,
  TrackingRecord,
  TradeInRequest,
  VerifiedReview,
} from '../types';

interface CustomerOrdersAndWarrantyViewProps {
  currentUser: AuthUser;
  trackingRecords: TrackingRecord[];
  tradeIns: TradeInRequest[];
  reviews: VerifiedReview[];
  onOpenWarrantyCard: (record: TrackingRecord) => void;
  onTrackCode: (code: string) => void;
  onSubmitReview: (payload: {
    bookingId: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
  onChatWithStoreId: (storeId: string) => void;
  onGoToProducts: () => void;
  onGoToTradeIn: () => void;
}

type OrderFilterTab = 'all' | 'active' | 'completed' | 'tradein';

export const CustomerOrdersAndWarrantyView: React.FC<
  CustomerOrdersAndWarrantyViewProps
> = ({
  currentUser,
  trackingRecords,
  tradeIns,
  reviews,
  onOpenWarrantyCard,
  onTrackCode,
  onSubmitReview,
  onChatWithStoreId,
  onGoToProducts,
  onGoToTradeIn,
}) => {
  const [filterTab, setFilterTab] = useState<OrderFilterTab>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [commentValue, setCommentValue] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const myRecords = useMemo(() => {
    return trackingRecords.filter((rec) => {
      if (!rec.customerId) return true;
      return (
        rec.customerId === currentUser.id ||
        rec.customerName === currentUser.name
      );
    });
  }, [trackingRecords, currentUser]);

  const filteredRecords = useMemo(() => {
    if (filterTab === 'active') {
      return myRecords.filter((r) => r.stage < 4);
    }
    if (filterTab === 'completed') {
      return myRecords.filter((r) => r.stage === 4);
    }
    return myRecords;
  }, [myRecords, filterTab]);

  const handleReviewSubmit = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault();
    setReviewError('');
    if (commentValue.trim().length < 3) {
      setReviewError('يرجى كتابة تعليق لا يقل عن 3 أحرف.');
      return;
    }
    setSubmittingReview(true);
    try {
      await onSubmitReview({
        bookingId,
        rating: ratingValue,
        comment: commentValue.trim(),
      });
      setReviewingId(null);
      setCommentValue('');
      setRatingValue(5);
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'تعذر إرسال التقييم الموثّق'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <section className="py-10 lg:py-14 bg-[#F8F9FA] dark:bg-slate-950 min-h-[75vh] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
              طلباتي وحجوزاتي وبطاقات الضمان
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              تابع جميع طلبات الشراء وتذاكر الصيانة، اعرض بطاقة الضمان بـ QR، وقيّم المتاجر بعد إتمام الخدمة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGoToTradeIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>استبدال جهاز</span>
            </button>
            <button
              type="button"
              onClick={onGoToProducts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>تصفح المنتجات</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي الطلبات</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {myRecords.length}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">قيد التنفيذ</div>
            <div className="text-xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums mt-1">
              {myRecords.filter((r) => r.stage < 4).length}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">مكتملة بضمان QR</div>
            <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
              {myRecords.filter((r) => r.stage === 4).length}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">طلبات الاستبدال</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {tradeIns.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl w-fit max-w-full overflow-x-auto">
          {[
            { id: 'all' as OrderFilterTab, label: `الكل (${myRecords.length})` },
            {
              id: 'active' as OrderFilterTab,
              label: `نشطة (${myRecords.filter((r) => r.stage < 4).length})`,
            },
            {
              id: 'completed' as OrderFilterTab,
              label: `مكتملة (${myRecords.filter((r) => r.stage === 4).length})`,
            },
            {
              id: 'tradein' as OrderFilterTab,
              label: `الاستبدال (${tradeIns.length})`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                filterTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filterTab === 'tradein' ? (
          tradeIns.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                لم تقدّم أي طلب استبدال جهاز حتى الآن
              </p>
              <button
                type="button"
                onClick={onGoToTradeIn}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                احسب قيمة جهازك القديم الآن
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tradeIns.map((tr) => (
                <div
                  key={tr.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                          {tr.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{tr.storeName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{tr.createdAt}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {tr.model} ({tr.storage}) — صحة بطارية {tr.batteryHealth}%
                      </h3>
                    </div>
                    <div className="text-right sm:text-left">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {tr.offeredValue ? 'العرض المعتمد من المتجر' : 'التقدير المبدئي'}
                      </div>
                      <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(tr.offeredValue ?? tr.estimatedValue)}
                      </div>
                    </div>
                  </div>
                  {tr.storeNotes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                      ملاحظة المتجر: {tr.storeNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <ClipboardList className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              لا توجد طلبات أو حجوزات في هذا القسم حالياً
            </p>
            <button
              type="button"
              onClick={onGoToProducts}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              تصفح الأجهزة المعروضة للبيع
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((rec) => {
              const existingReview = reviews.find(
                (r) => r.bookingId.toUpperCase() === rec.id.toUpperCase()
              );
              const isCompleted = rec.stage === 4;
              const canReview = isCompleted && !rec.reviewed && !existingReview;

              return (
                <article
                  key={rec.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                          {rec.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {rec.kind === 'repair'
                            ? 'تذكرة صيانة'
                            : rec.kind === 'reservation'
                              ? 'حجز شراء'
                              : 'طلب متجر'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.storeName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{rec.createdAt}</span>
                      </div>
                      <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                        {rec.title}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {rec.subtitle}
                      </p>
                    </div>

                    <div className="text-right sm:text-left shrink-0">
                      <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatCurrency(rec.totalPrice)}
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        {rec.warrantyLabel}
                      </div>
                    </div>
                  </div>

                  {/* 4-Stage Progress Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rec.stageLabels.map((lbl, idx) => {
                      const stageNum = (idx + 1) as 1 | 2 | 3 | 4;
                      const done = rec.stage >= stageNum;
                      const current = rec.stage === stageNum;
                      return (
                        <div key={lbl} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              done
                                ? 'bg-blue-700 dark:bg-blue-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <div className="text-xs flex items-center gap-1.5">
                            <span
                              className={`font-mono tabular-nums font-bold ${
                                current
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : done
                                    ? 'text-slate-900 dark:text-slate-100'
                                    : 'text-slate-400 dark:text-slate-600'
                              }`}
                            >
                              0{stageNum}
                            </span>
                            <span
                              className={
                                current
                                  ? 'font-semibold text-slate-900 dark:text-slate-100'
                                  : done
                                    ? 'text-slate-700 dark:text-slate-300'
                                    : 'text-slate-400 dark:text-slate-600'
                              }
                            >
                              {lbl}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Technician & Fault Media Notes */}
                  {(rec.assignedTechnician ||
                    rec.technicianReport ||
                    rec.notes) && (
                    <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {rec.assignedTechnician && (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          <Wrench className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          <span>الفني المسؤول: {rec.assignedTechnician}</span>
                        </div>
                      )}
                      {rec.technicianReport && (
                        <p>
                          <strong className="text-slate-900 dark:text-slate-100">
                            التقرير الفني:{' '}
                          </strong>
                          {rec.technicianReport}
                        </p>
                      )}
                      <p>
                        <strong className="text-slate-900 dark:text-slate-100">
                          ملخص الحالة:{' '}
                        </strong>
                        {rec.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => onOpenWarrantyCard(rec)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>بطاقة الضمان QR</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onTrackCode(rec.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        <span>تفاصيل التتبع</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onChatWithStoreId(rec.storeId)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>مراسلة المتجر</span>
                      </button>
                    </div>

                    {canReview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingId(reviewingId === rec.id ? null : rec.id);
                          setReviewError('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>قيّم المتجر والخدمة</span>
                      </button>
                    ) : existingReview ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم التقييم الموثّق ({existingReview.rating}/5)</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        التقييم يُفعَّل تلقائياً بعد إتمام الطلب
                      </span>
                    )}
                  </div>

                  {/* Inline Verified Review Form (Unlocked strictly at stage === 4) */}
                  {canReview && reviewingId === rec.id && (
                    <form
                      onSubmit={(e) => handleReviewSubmit(e, rec.id)}
                      className="mt-3 p-4 rounded-xl bg-amber-50/50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          تقييم موثّق للطلب {rec.id}
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingValue(star)}
                              aria-label={`${star} نجوم`}
                              className="p-1 cursor-pointer"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= ratingValue
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={commentValue}
                        onChange={(e) => setCommentValue(e.target.value)}
                        placeholder="شارك تجربتك الحقيقية مع المتجر وجودة الجهاز أو الصيانة..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 resize-none"
                      />
                      {reviewError && (
                        <p className="text-xs text-red-700 dark:text-red-400">
                          {reviewError}
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewingId(null)}
                          className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg cursor-pointer"
                        >
                          {submittingReview ? 'جاري النشر...' : 'نشر التقييم الموثّق'}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
