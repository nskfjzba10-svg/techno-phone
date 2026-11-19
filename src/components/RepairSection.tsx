import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Film,
  ImagePlus,
  Laptop,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  UserCheck,
  Watch,
  Wrench,
} from 'lucide-react';
import {
  IRAQ_GOVERNORATES,
  REPAIR_CAUSES,
  REPAIR_DEVICE_TYPES,
  REPAIR_MODELS,
  REPAIR_SERVICES,
  REPAIR_SYMPTOMS,
  formatCurrency,
  getGovernorateDistricts,
} from '../data/catalog';
import { uploadMediaFile } from '../lib/api';
import {
  AuthUser,
  RepairDeviceType,
  StoreProfile,
  TrackingRecord,
} from '../types';

interface RepairSectionProps {
  stores: StoreProfile[];
  currentUser?: AuthUser | null;
  preferredStoreId?: string;
  trackingRecords: TrackingRecord[];
  onCreateRepairTicket: (ticket: TrackingRecord) => void;
  onOpenWarrantyCard?: (record: TrackingRecord) => void;
  activeTicketId: string;
  onSelectTicketId: (id: string) => void;
}

type WizardStep = 1 | 2 | 3;

interface UploadedFaultMedia {
  url: string;
  kind: 'image' | 'video';
}

const DEVICE_ICONS: Record<RepairDeviceType, React.ReactNode> = {
  smartphone: <Smartphone className="w-5 h-5" />,
  tablet: <Tablet className="w-5 h-5" />,
  laptop: <Laptop className="w-5 h-5" />,
  smartwatch: <Watch className="w-5 h-5" />,
};

const TIME_SLOTS = [
  'الفترة الصباحية (10:00 ص - 01:00 م)',
  'فترة العصر (04:00 م - 07:00 م)',
  'الفترة المسائية (07:30 م - 10:30 م)',
];

function isVideoMediaUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.startsWith('data:video/');
}

export const RepairSection: React.FC<RepairSectionProps> = ({
  stores,
  currentUser,
  preferredStoreId,
  trackingRecords,
  onCreateRepairTicket,
  onOpenWarrantyCard,
  activeTicketId,
  onSelectTicketId,
}) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [targetStoreId, setTargetStoreId] = useState<string>(
    preferredStoreId || stores[0]?.id || 'store-techno-baghdad'
  );

  useEffect(() => {
    if (preferredStoreId) {
      setTargetStoreId(preferredStoreId);
    }
  }, [preferredStoreId]);

  // Step 1: Device specification
  const [deviceType, setDeviceType] = useState<RepairDeviceType | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [customModelName, setCustomModelName] = useState<string>('');
  const [deviceColorOrStorage, setDeviceColorOrStorage] = useState<string>('');
  const [imei, setImei] = useState<string>('');
  const [previouslyOpened, setPreviouslyOpened] = useState<'no' | 'yes'>('no');

  // Step 2: Problem, symptoms & fault media upload
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [issueCause, setIssueCause] = useState<string>(REPAIR_CAUSES[0]);
  const [urgency, setUrgency] = useState<'standard' | 'express'>('standard');
  const [notes, setNotes] = useState<string>('');
  const [faultMedia, setFaultMedia] = useState<UploadedFaultMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Step 3: Contact, Iraqi governorate/district & appointment
  const defaultGov = currentUser?.city || 'بغداد';
  const [customerName, setCustomerName] = useState<string>(
    currentUser?.name || ''
  );
  const [phone, setPhone] = useState<string>('');
  const [governorate, setGovernorate] = useState<string>(defaultGov);
  const [district, setDistrict] = useState<string>(
    currentUser?.district || getGovernorateDistricts(defaultGov)[0] || ''
  );
  const [deliveryMethod, setDeliveryMethod] = useState<'branch' | 'pickup'>(
    'branch'
  );
  const [preferredDate, setPreferredDate] = useState<string>('اليوم');
  const [preferredSlot, setPreferredSlot] = useState<string>(TIME_SLOTS[1]);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [backupConfirmed, setBackupConfirmed] = useState<boolean>(false);

  const [stepError, setStepError] = useState<string>('');
  const [submittedTicket, setSubmittedTicket] = useState<TrackingRecord | null>(
    null
  );
  const [searchInput, setSearchInput] = useState(activeTicketId);

  useEffect(() => {
    setSearchInput(activeTicketId);
  }, [activeTicketId]);

  useEffect(() => {
    if (currentUser?.name && !customerName) {
      setCustomerName(currentUser.name);
    }
  }, [currentUser?.name, customerName]);

  const districts = useMemo(
    () => getGovernorateDistricts(governorate),
    [governorate]
  );

  const availableModels = useMemo(() => {
    if (!deviceType) return [];
    return REPAIR_MODELS.filter((m) => m.deviceType === deviceType);
  }, [deviceType]);

  const currentDeviceTypeLabel = useMemo(() => {
    if (!deviceType) return '';
    return REPAIR_DEVICE_TYPES.find((d) => d.id === deviceType)?.label || '';
  }, [deviceType]);

  const currentModel = useMemo(() => {
    if (!selectedModelId || selectedModelId === 'custom') return null;
    return availableModels.find((m) => m.id === selectedModelId) || null;
  }, [availableModels, selectedModelId]);

  const resolvedModelName = useMemo(() => {
    if (selectedModelId === 'custom') {
      return customModelName.trim();
    }
    return currentModel?.name || '';
  }, [selectedModelId, customModelName, currentModel]);

  const currentService = useMemo(() => {
    if (!selectedServiceId) return null;
    return REPAIR_SERVICES.find((s) => s.id === selectedServiceId) || null;
  }, [selectedServiceId]);

  const servicePrice = useMemo(() => {
    if (!currentService) return 0;
    const multiplier = currentModel?.priceMultiplier ?? 1;
    return Math.round((currentService.basePrice * multiplier) / 5000) * 5000;
  }, [currentModel, currentService]);

  const expressFee = urgency === 'express' ? 15000 : 0;
  const pickupFee =
    deliveryMethod === 'pickup' && servicePrice < 150000 ? 10000 : 0;
  const totalEstimatedPrice = servicePrice + expressFee + pickupFee;

  const handleSelectDeviceType = (type: RepairDeviceType) => {
    setDeviceType(type);
    setSelectedModelId('');
    setCustomModelName('');
    setStepError('');
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom]
    );
    setStepError('');
  };

  const handleFaultMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepError('');
    setUploadingMedia(true);
    try {
      const res = await uploadMediaFile(file);
      setFaultMedia((prev) => [...prev.slice(0, 3), res]);
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : 'تعذر رفع ملف العطل.'
      );
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const validateStep1 = (): boolean => {
    if (!deviceType) {
      setStepError('يرجى اختيار نوع الجهاز أولاً (هاتف، تابلت، لابتوب، أو ساعة).');
      return false;
    }
    if (!selectedModelId) {
      setStepError('يرجى تحديد موديل الجهاز أو اختيار "موديل آخر" لإدخاله يدوياً.');
      return false;
    }
    if (selectedModelId === 'custom' && customModelName.trim().length < 2) {
      setStepError('يرجى كتابة اسم وموديل الجهاز بشكل واضح.');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!selectedServiceId || !currentService) {
      setStepError('يرجى تحديد المشكلة أو نوع الصيانة المطلوبة للمتابعة.');
      return false;
    }
    if (
      selectedServiceId === 'full-diagnosis' &&
      selectedSymptoms.length === 0 &&
      notes.trim().length < 5 &&
      faultMedia.length === 0
    ) {
      setStepError(
        'عند اختيار الفحص الشامل، يرجى تحديد عرض واحد أو رفع صورة/فيديو للعطل أو كتابة وصف.'
      );
      return false;
    }
    return true;
  };

  const handleNextFromStep1 = () => {
    setStepError('');
    if (validateStep1()) setStep(2);
  };

  const handleNextFromStep2 = () => {
    setStepError('');
    if (validateStep2()) setStep(3);
  };

  const handleGoToStep = (target: WizardStep) => {
    setStepError('');
    if (target === 1) {
      setStep(1);
      return;
    }
    if (target === 2) {
      if (validateStep1()) setStep(2);
      return;
    }
    if (target === 3) {
      if (validateStep1() && validateStep2()) setStep(3);
    }
  };

  const handleSubmitRepair = (e: React.FormEvent) => {
    e.preventDefault();
    setStepError('');

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2() || !currentService) {
      setStep(2);
      return;
    }
    if (!customerName.trim() || customerName.trim().length < 2) {
      setStepError('يرجى إدخال الاسم الكامل لصاحب الجهاز.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setStepError('يرجى إدخال رقم جوال عراقي صحيح للتواصل وتأكيد الموعد.');
      return;
    }
    if (deliveryMethod === 'pickup' && pickupAddress.trim().length < 4) {
      setStepError('يرجى كتابة الحي والعنوان لاستلام الجهاز عبر المندوب.');
      return;
    }
    if (!backupConfirmed) {
      setStepError('يرجى تأكيد الموافقة على سياسة الفحص والنسخ الاحتياطي قبل الإرسال.');
      return;
    }

    const randomCode = Math.floor(2000 + Math.random() * 7999);
    const ticketId = `TP-${randomCode}`;
    const symptomsSummary =
      selectedSymptoms.length > 0
        ? `الأعراض: ${selectedSymptoms.join('، ')}`
        : 'بدون أعراض إضافية محددة';

    const detailedNotes = [
      `${currentDeviceTypeLabel}: ${resolvedModelName}${deviceColorOrStorage.trim() ? ` (${deviceColorOrStorage.trim()})` : ''}`,
      imei.trim() ? `IMEI: ${imei.trim()}` : '',
      `السبب المحتمل: ${issueCause}`,
      symptomsSummary,
      previouslyOpened === 'yes'
        ? 'سبق فتح الجهاز لصيانة سابقة'
        : 'لم يُفتح الجهاز سابقاً',
      urgency === 'express'
        ? 'أولوية: صيانة عاجلة نفس اليوم'
        : 'أولوية: صيانة قياسية',
      faultMedia.length > 0
        ? `مرفقات العميل: ${faultMedia.length} صورة/فيديو للعطل`
        : '',
      notes.trim() ? `ملاحظات العميل: ${notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const chosenStore =
      stores.find((s) => s.id === targetStoreId) || stores[0];
    const resolvedStoreId = chosenStore?.id || 'store-techno-baghdad';
    const resolvedStoreName =
      chosenStore?.name || 'تكنو فون — فرع المنصور الرئيسي';

    const handoverSummary =
      deliveryMethod === 'branch'
        ? `${resolvedStoreName} · تسليم بالفرع (${preferredDate} — ${preferredSlot})`
        : `${resolvedStoreName} · استلام من المنزل (${governorate} - ${district}، ${pickupAddress.trim()})`;

    const newTicket: TrackingRecord = {
      id: ticketId,
      kind: 'repair',
      storeId: resolvedStoreId,
      storeOwnerId: chosenStore?.ownerId,
      storeName: resolvedStoreName,
      customerId: currentUser?.id,
      customerName: customerName.trim(),
      phone: phone.trim(),
      governorate,
      district,
      title: `${resolvedModelName} — ${currentService.label}`,
      subtitle: handoverSummary,
      createdAt: 'الآن',
      stage: 1,
      stageLabels: [
        'تم تسجيل الطلب',
        'الفحص والتشخيص',
        'الصيانة واختبار الجودة',
        'جاهز للاستلام / التوصيل',
      ],
      estimatedReady:
        urgency === 'express'
          ? 'معالجة عاجلة خلال نفس اليوم'
          : `المدة المقدرة: ${currentService.durationLabel}`,
      totalPrice: totalEstimatedPrice,
      notes: detailedNotes,
      warrantyLabel: `ضمان ${currentService.warrantyMonths} شهراً على الصيانة`,
      warrantyMonths: currentService.warrantyMonths,
      imei: imei.trim() || undefined,
      faultMediaUrls:
        faultMedia.length > 0 ? faultMedia.map((m) => m.url) : undefined,
    };

    onCreateRepairTicket(newTicket);
    setSubmittedTicket(newTicket);
    setSearchInput(ticketId);
    onSelectTicketId(ticketId);
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setStep(1);
    setDeviceType(null);
    setSelectedModelId('');
    setCustomModelName('');
    setDeviceColorOrStorage('');
    setImei('');
    setPreviouslyOpened('no');
    setSelectedServiceId(null);
    setSelectedSymptoms([]);
    setIssueCause(REPAIR_CAUSES[0]);
    setUrgency('standard');
    setNotes('');
    setFaultMedia([]);
    setPhone('');
    setPickupAddress('');
    setBackupConfirmed(false);
    setStepError('');
  };

  const trackedRecord = useMemo(() => {
    const q = activeTicketId.trim().toUpperCase();
    return trackingRecords.find((r) => r.id.toUpperCase() === q) || null;
  }, [activeTicketId, trackingRecords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectTicketId(searchInput.trim());
  };

  return (
    <>
      {/* Section 3A: Detailed Interactive Repair Request Form */}
      <section
        id="repair"
        className="py-14 lg:py-20 bg-white dark:bg-slate-950 border-t border-b border-slate-200 dark:border-slate-800 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                نموذج طلب الصيانة الذكي
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                حدّد نوع الجهاز وأرفق صورة أو فيديو قصير للعطل ليتمكّن مهندس الصيانة من تقدير الكلفة بدقة وإصدار بطاقة الضمان الإلكترونية QR.
              </p>
            </div>
          </div>

          {submittedTicket ? (
            <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 max-w-3xl">
              <div className="flex items-start gap-3 mb-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    تم استلام طلب الصيانة بنجاح
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    رقم تذكرة الصيانة:{' '}
                    <strong className="font-mono text-blue-700 dark:text-blue-400 tabular-nums">
                      {submittedTicket.id}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-sm mb-6">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">الجهاز والخدمة</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-left">
                    {submittedTicket.title}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">طريقة التسليم والموعد</span>
                  <span className="text-slate-800 dark:text-slate-200 text-left">
                    {submittedTicket.subtitle}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">تفاصيل التشخيص المبدئي</span>
                  <span className="text-slate-700 dark:text-slate-300 text-left max-w-md">
                    {submittedTicket.notes}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-4">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">التكلفة التقديرية</span>
                  <span className="font-bold text-lg text-blue-700 dark:text-blue-400 tabular-nums">
                    {formatCurrency(submittedTicket.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('track');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg cursor-pointer min-h-[44px]"
                >
                  متابعة التذكرة في شاشة التتبع
                </button>
                {onOpenWarrantyCard && (
                  <button
                    type="button"
                    onClick={() => onOpenWarrantyCard(submittedTicket)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer min-h-[44px]"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>إيصال وبطاقة الضمان QR</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[44px]"
                >
                  إنشاء طلب صيانة جديد
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main 3-Step Interactive Form */}
              <div className="lg:col-span-8 space-y-6">
                <div
                  role="tablist"
                  aria-label="خطوات طلب الصيانة"
                  className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  {[
                    { num: 1 as WizardStep, title: '01. تحديد الجهاز' },
                    { num: 2 as WizardStep, title: '02. العطل والمرفقات' },
                    { num: 3 as WizardStep, title: '03. الموعد والإرسال' },
                  ].map((s) => {
                    const isCurrent = step === s.num;
                    const isCompleted =
                      (s.num === 1 && !!deviceType && !!resolvedModelName) ||
                      (s.num === 2 && !!currentService);
                    return (
                      <button
                        key={s.num}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        onClick={() => handleGoToStep(s.num)}
                        className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
                          isCurrent
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-sm'
                            : isCompleted
                              ? 'text-blue-700 dark:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {isCompleted && !isCurrent && (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{s.title}</span>
                      </button>
                    );
                  })}
                </div>

                {stepError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" />
                    <span>{stepError}</span>
                  </div>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                  <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        أولاً: حدّد نوع الجهاز والموديل
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        اختيار الجهاز بدقة يحدد القطع المتوافقة والأسعار الدقيقة للصيانة.
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
                        نوع الجهاز <span className="text-red-600 dark:text-red-400">*</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {REPAIR_DEVICE_TYPES.map((dt) => {
                          const isSelected = deviceType === dt.id;
                          return (
                            <button
                              key={dt.id}
                              type="button"
                              onClick={() => handleSelectDeviceType(dt.id)}
                              className={`p-4 rounded-xl border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[92px] ${
                                isSelected
                                  ? 'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <span
                                className={
                                  isSelected
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                              >
                                {DEVICE_ICONS[dt.id]}
                              </span>
                              <span className="text-sm">{dt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {deviceType && (
                      <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div>
                          <label
                            htmlFor="wizard-model-select"
                            className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2"
                          >
                            موديل الجهاز <span className="text-red-600 dark:text-red-400">*</span>
                          </label>
                          <select
                            id="wizard-model-select"
                            value={selectedModelId}
                            onChange={(e) => {
                              setSelectedModelId(e.target.value);
                              setStepError('');
                            }}
                            className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[44px]"
                          >
                            <option value="">-- اختر موديل {currentDeviceTypeLabel} --</option>
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.brand})
                              </option>
                            ))}
                            <option value="custom">موديل آخر (إدخال الاسم يدوياً)</option>
                          </select>
                        </div>

                        {selectedModelId === 'custom' && (
                          <div>
                            <label
                              htmlFor="custom-model-input"
                              className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                            >
                              اكتب اسم الشركة والموديل بدقة <span className="text-red-600 dark:text-red-400">*</span>
                            </label>
                            <input
                              id="custom-model-input"
                              type="text"
                              value={customModelName}
                              onChange={(e) => setCustomModelName(e.target.value)}
                              placeholder="مثال: Google Pixel 9 Pro أو Asus Zenbook 14"
                              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label
                              htmlFor="device-color-storage"
                              className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                            >
                              السعة أو اللون (اختياري)
                            </label>
                            <input
                              id="device-color-storage"
                              type="text"
                              value={deviceColorOrStorage}
                              onChange={(e) =>
                                setDeviceColorOrStorage(e.target.value)
                              }
                              placeholder="مثال: 256GB · تيتانيوم"
                              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="device-imei"
                              className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                            >
                              رقم IMEI (اختياري)
                            </label>
                            <input
                              id="device-imei"
                              type="text"
                              dir="ltr"
                              value={imei}
                              onChange={(e) => setImei(e.target.value)}
                              placeholder="358491029481024"
                              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right font-mono tabular-nums focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                              هل سبق صيانة الجهاز؟
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviouslyOpened('no')}
                                className={`py-2.5 px-2.5 text-xs font-medium rounded-lg border cursor-pointer min-h-[42px] transition-colors ${
                                  previouslyOpened === 'no'
                                    ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                لا، وكالة
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviouslyOpened('yes')}
                                className={`py-2.5 px-2.5 text-xs font-medium rounded-lg border cursor-pointer min-h-[42px] transition-colors ${
                                  previouslyOpened === 'yes'
                                    ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                نعم، فُتح
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextFromStep1}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                      >
                        <span>التالي: تحديد المشكلة والمرفقات</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        ثانياً: حدّد المشكلة وأرفق صور أو فيديو العطل
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        الجهاز المحدد:{' '}
                        <strong className="text-slate-900 dark:text-slate-100">
                          {resolvedModelName}
                        </strong>
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
                        نوع العطل أو الصيانة المطلوبة{' '}
                        <span className="text-red-600 dark:text-red-400">*</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {REPAIR_SERVICES.map((srv) => {
                          const isSelected = selectedServiceId === srv.id;
                          const itemPrice =
                            Math.round(
                              (srv.basePrice *
                                (currentModel?.priceMultiplier ?? 1)) /
                                5000
                            ) * 5000;
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              onClick={() => {
                                setSelectedServiceId(srv.id);
                                setStepError('');
                              }}
                              className={`p-4 text-right rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 w-full">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {srv.label}
                                </span>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums shrink-0">
                                  {formatCurrency(itemPrice)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {srv.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fault Photo & Short Video Upload */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            رفع صورة أو فيديو قصير للعطل (لتقدير الكلفة بدقة قبل حضورك)
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            يدعم صور الأعطال أو فيديو قصير يوضح مشكلة الشاشة أو الشحن (حتى 4 مرفقات، حد 8 ميجابايت للملف)
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg cursor-pointer transition-colors">
                          <ImagePlus className="w-4 h-4" />
                          <span>
                            {uploadingMedia
                              ? 'جاري الرفع...'
                              : 'إرفاق صورة / فيديو'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            disabled={uploadingMedia || faultMedia.length >= 4}
                            onChange={handleFaultMediaUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>

                      {faultMedia.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {faultMedia.map((media, idx) => (
                            <div
                              key={media.url}
                              className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 aspect-[4/3]"
                            >
                              {media.kind === 'video' ? (
                                <video
                                  src={media.url}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={media.url}
                                  alt={`صورة العطل ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setFaultMedia((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                aria-label="حذف المرفق"
                                className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-slate-900/80 text-white inline-flex items-center justify-center hover:bg-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[10px] inline-flex items-center gap-1">
                                {media.kind === 'video' && (
                                  <Film className="w-3 h-3" />
                                )}
                                <span>{media.kind === 'video' ? 'فيديو' : 'صورة'}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
                        الأعراض التي لاحظتها (يمكنك اختيار أكثر من عرض)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {REPAIR_SYMPTOMS.map((symptom) => {
                          const checked = selectedSymptoms.includes(symptom);
                          return (
                            <button
                              key={symptom}
                              type="button"
                              onClick={() => toggleSymptom(symptom)}
                              className={`px-3 py-2.5 text-xs text-right rounded-lg border transition-colors cursor-pointer flex items-center gap-2 min-h-[42px] ${
                                checked
                                  ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-slate-900 dark:text-slate-100 font-semibold'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-blue-700 dark:bg-blue-600 border-blue-700 dark:border-blue-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3" />}
                              </span>
                              <span>{symptom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="issue-cause"
                          className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                        >
                          السبب المحتمل لحدوث المشكلة
                        </label>
                        <select
                          id="issue-cause"
                          value={issueCause}
                          onChange={(e) => setIssueCause(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[44px]"
                        >
                          {REPAIR_CAUSES.map((cause) => (
                            <option key={cause} value={cause}>
                              {cause}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                          أولوية التنفيذ
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setUrgency('standard')}
                            className={`py-2.5 px-3 text-xs font-medium rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                              urgency === 'standard'
                                ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            قياسي (حسب الدور)
                          </button>
                          <button
                            type="button"
                            onClick={() => setUrgency('express')}
                            className={`py-2.5 px-3 text-xs font-medium rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                              urgency === 'express'
                                ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            عاجل نفس اليوم (+15,000 د.ع)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="problem-details-notes"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                      >
                        وصف تفصيلي للمشكلة (اختياري)
                      </label>
                      <textarea
                        id="problem-details-notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="اشرح متى بدأت المشكلة أو أي تفاصيل إضافية تساعد مهندس الصيانة..."
                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStepError('');
                          setStep(1);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[44px]"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>السابق: الجهاز</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextFromStep2}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                      >
                        <span>التالي: الموعد والتواصل</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <form
                    onSubmit={handleSubmitRepair}
                    className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6"
                  >
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        ثالثاً: اختيار المتجر وبيانات التواصل والمحافظة
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        حدد المتجر الذي ترغب بإرسال طلب الصيانة إليه ثم أكمل بياناتك.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="repair-target-store"
                        className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                      >
                        المتجر / مركز الصيانة المستلم للطلب *
                      </label>
                      <select
                        id="repair-target-store"
                        value={targetStoreId}
                        onChange={(e) => setTargetStoreId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[44px]"
                      >
                        {stores.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} — {st.city}
                            {st.district ? ` (${st.district})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="repair-customer-name"
                          className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                        >
                          الاسم الكامل <span className="text-red-600 dark:text-red-400">*</span>
                        </label>
                        <input
                          id="repair-customer-name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: مصطفى الجبوري"
                          className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="repair-customer-phone"
                          className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                        >
                          رقم الجوال <span className="text-red-600 dark:text-red-400">*</span>
                        </label>
                        <input
                          id="repair-customer-phone"
                          type="tel"
                          dir="ltr"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="077XXXXXXXX"
                          className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right font-mono tabular-nums focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                          المحافظة
                        </label>
                        <select
                          value={governorate}
                          onChange={(e) => {
                            const next = e.target.value;
                            setGovernorate(next);
                            setDistrict(getGovernorateDistricts(next)[0] || '');
                          }}
                          className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer"
                        >
                          {IRAQ_GOVERNORATES.map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                          القضاء / المنطقة
                        </label>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer"
                        >
                          {districts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        طريقة تسليم الجهاز للمختبر
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('branch')}
                          className={`p-3.5 text-right rounded-lg border cursor-pointer transition-colors ${
                            deliveryMethod === 'branch'
                              ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-slate-900 dark:text-slate-100 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-sm">زيارة مركز الصيانة المختار</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            فحص فوري مجاني أمامك بدون رسوم توصيل
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('pickup')}
                          className={`p-3.5 text-right rounded-lg border cursor-pointer transition-colors ${
                            deliveryMethod === 'pickup'
                              ? 'border-blue-700 dark:border-blue-500 bg-white dark:bg-blue-950/40 text-slate-900 dark:text-slate-100 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-sm">مندوب استلام وتوصيل من المنزل</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            {servicePrice >= 150000
                              ? 'مجاني لهذه الخدمة'
                              : 'رسوم 10,000 د.ع ذهاباً وإياباً'}
                          </div>
                        </button>
                      </div>

                      {deliveryMethod === 'branch' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="appointment-day"
                              className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                            >
                              اليوم المفضل
                            </label>
                            <select
                              id="appointment-day"
                              value={preferredDate}
                              onChange={(e) => setPreferredDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[44px]"
                            >
                              <option value="اليوم">اليوم</option>
                              <option value="غداً">غداً</option>
                              <option value="بعد غد">بعد غد</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor="appointment-slot"
                              className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                            >
                              الفترة الزمنية
                            </label>
                            <select
                              id="appointment-slot"
                              value={preferredSlot}
                              onChange={(e) => setPreferredSlot(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[44px]"
                            >
                              {TIME_SLOTS.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label
                            htmlFor="pickup-address"
                            className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                          >
                            العنوان التفصيلي ونقطة دالة للاستلام{' '}
                            <span className="text-red-600 dark:text-red-400">*</span>
                          </label>
                          <input
                            id="pickup-address"
                            type="text"
                            value={pickupAddress}
                            onChange={(e) => setPickupAddress(e.target.value)}
                            placeholder="مثال: شارع الأميرات، قرب جامع..."
                            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-2.5 pt-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <input
                        type="checkbox"
                        checked={backupConfirmed}
                        onChange={(e) => setBackupConfirmed(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700 cursor-pointer"
                      />
                      <span>
                        أقرّ بأني قمت بأخذ نسخة احتياطية من بياناتي المهمة (أو أن الجهاز لا يسمح بذلك حالياً) وأوافق على الفحص الهندسي لتأكيد التكلفة النهائية قبل الإصلاح.
                      </span>
                    </label>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStepError('');
                          setStep(2);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[44px]"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>السابق: المشكلة</span>
                      </button>

                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer min-h-[46px]"
                      >
                        <Wrench className="w-4 h-4" />
                        <span>إرسال طلب الصيانة</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Persistent Live Estimate & Diagnostic Summary Panel */}
              <aside className="lg:col-span-4 bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    ملخص طلب الصيانة
                  </div>
                  <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                    {currentService
                      ? formatCurrency(totalEstimatedPrice)
                      : 'بانتظار التحديد'}
                  </div>
                  {currentService && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      تكلفة تقديرية شاملة التركيب والفحص
                    </p>
                  )}
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0">نوع الجهاز</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100 text-left">
                      {currentDeviceTypeLabel || 'لم يُحدد بعد'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0">الموديل</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100 text-left">
                      {resolvedModelName || 'لم يُحدد بعد'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0">المشكلة</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100 text-left">
                      {currentService?.label || 'لم تُحدد بعد'}
                    </dd>
                  </div>
                  {faultMedia.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400 shrink-0">مرفقات العطل</dt>
                      <dd className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-left tabular-nums">
                        {faultMedia.length} ملف مرفق
                      </dd>
                    </div>
                  )}
                  {urgency === 'express' && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400 shrink-0">خدمة عاجلة</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        +{formatCurrency(15000)}
                      </dd>
                    </div>
                  )}
                  {deliveryMethod === 'pickup' && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400 shrink-0">استلام وتوصيل</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {pickupFee === 0 ? 'مجاني' : `+${formatCurrency(pickupFee)}`}
                      </dd>
                    </div>
                  )}
                </dl>

                {currentService ? (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                      <span>
                        المدة المتوقعة:{' '}
                        {urgency === 'express'
                          ? 'أولوية قصوى (نفس اليوم)'
                          : currentService.durationLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                      <span className="tabular-nums">
                        ضمان معتمد لمدة {currentService.warrantyMonths} شهراً
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                      <span>تتبع مباشر + بطاقة ضمان إلكترونية QR</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    أكمل الخطوة الأولى (تحديد الجهاز) ثم الخطوة الثانية (تحديد المشكلة وإرفاق صور العطل) لإظهار التكلفة والضمان قبل إرسال الطلب.
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>

      {/* Section 3B: Live Order & Repair Ticket Tracker */}
      <section
        id="track"
        className="py-14 lg:py-20 bg-[#F8F9FA] dark:bg-slate-900/50 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                  تتبع حالة الصيانة والطلبات
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  أدخل رقم تذكرة الصيانة أو رقم طلب المتجر لمتابعة مراحل التنفيذ وتقرير الفني المختص وعرض بطاقة الضمان الإلكترونية QR.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    dir="ltr"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="TP-1042"
                    aria-label="رقم التذكرة أو الطلب"
                    className="w-full pr-10 pl-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right font-mono tabular-nums focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  استعلام
                </button>
              </form>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>نماذج نشطة للتجربة:</span>
                {trackingRecords.slice(0, 4).map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      setSearchInput(rec.id);
                      onSelectTicketId(rec.id);
                    }}
                    className={`font-mono tabular-nums underline underline-offset-4 cursor-pointer transition-colors ${
                      activeTicketId.toUpperCase() === rec.id.toUpperCase()
                        ? 'text-blue-700 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                    }`}
                  >
                    {rec.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              {trackedRecord ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                          {trackedRecord.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {trackedRecord.kind === 'repair'
                            ? 'تذكرة صيانة'
                            : trackedRecord.kind === 'reservation'
                              ? 'حجز شراء'
                              : 'طلب متجر'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {trackedRecord.createdAt}
                        </span>
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        {trackedRecord.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        العميل: {trackedRecord.customerName} — {trackedRecord.subtitle}
                      </p>
                    </div>

                    <div className="text-right sm:text-left shrink-0">
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatCurrency(trackedRecord.totalPrice)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {trackedRecord.warrantyLabel}
                      </div>
                    </div>
                  </div>

                  {/* 4-Stage Progress Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {trackedRecord.stageLabels.map((label, index) => {
                      const stepNum = (index + 1) as 1 | 2 | 3 | 4;
                      const isDone = trackedRecord.stage >= stepNum;
                      const isCurrent = trackedRecord.stage === stepNum;
                      return (
                        <div key={label} className="space-y-2">
                          <div
                            className={`h-1.5 rounded-full ${
                              isDone
                                ? 'bg-blue-700 dark:bg-blue-500'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                          <div className="text-xs flex items-center gap-1.5">
                            <span
                              className={`font-mono tabular-nums font-semibold ${
                                isCurrent
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : isDone
                                    ? 'text-slate-900 dark:text-slate-100'
                                    : 'text-slate-400 dark:text-slate-600'
                              }`}
                            >
                              0{stepNum}
                            </span>
                            <span
                              className={
                                isCurrent
                                  ? 'font-semibold text-slate-900 dark:text-slate-100'
                                  : isDone
                                    ? 'text-slate-700 dark:text-slate-300'
                                    : 'text-slate-400 dark:text-slate-600'
                              }
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Assigned Technician & Technical Report */}
                  {(trackedRecord.assignedTechnician ||
                    trackedRecord.technicianReport) && (
                    <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-1.5">
                      {trackedRecord.assignedTechnician && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                          <UserCheck className="w-4 h-4" />
                          <span>
                            الفني المسؤول: {trackedRecord.assignedTechnician}
                          </span>
                        </div>
                      )}
                      {trackedRecord.technicianReport && (
                        <p className="text-xs text-blue-950 dark:text-blue-100 leading-relaxed flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <strong>التقرير الفني: </strong>
                            {trackedRecord.technicianReport}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Uploaded Fault Media Previews */}
                  {trackedRecord.faultMediaUrls &&
                    trackedRecord.faultMediaUrls.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          صور / فيديو العطل المرفقة:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {trackedRecord.faultMediaUrls.map((url, idx) => (
                            <div
                              key={`${url}-${idx}`}
                              className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[4/3]"
                            >
                              {isVideoMediaUrl(url) ? (
                                <video
                                  src={url}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={url}
                                  alt={`مرفق عطل ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Status notes & QR Warranty button */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong className="text-slate-900 dark:text-slate-100">
                        تحديث الحالة:{' '}
                      </strong>
                      {trackedRecord.notes}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="text-xs font-medium text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-transparent dark:border-blue-900/50 px-3 py-2 rounded-lg whitespace-nowrap">
                        {trackedRecord.estimatedReady}
                      </div>
                      {onOpenWarrantyCard && trackedRecord.stage === 4 && (
                        <button
                          type="button"
                          onClick={() => onOpenWarrantyCard(trackedRecord)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>عرض بطاقة الضمان QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                    لم يتم العثور على سجل مطابق للرقم المدخل
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    تأكد من صحة رقم التذكرة (مثل TP-1042) أو رقم الطلب (مثل ORD-2026-4120).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
