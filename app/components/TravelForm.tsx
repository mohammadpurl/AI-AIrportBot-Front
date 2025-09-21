"use client";
import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

import React, { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
 
import { Plus, Minus, Calendar, Plane, Users, Phone, Mail, FileText, CreditCard } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { parseDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "@/app/components/ui/button";


import { Badge } from "@/app/components/ui/badge";


import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useApiNotification } from "@/hooks/useApiNotification";
import { Label } from "./ui/label";
import { Passenger, TicketInfo } from "@/types/type";
import { createOrder, createPassenger, getOrderPrices, fetchTrip, findFlightByNumber, updateTrip, getPaymentLinkNew } from "@/services/api";
import { travelFormSchema, ValidatedTravelForm, ValidatedPassenger } from "@/lib/validation";

// Extended Passenger interface with additional fields
interface ExtendedPassenger extends ValidatedPassenger {
  attach_file?: File;
}

// Form data type for react-hook-form
type FormData = ValidatedTravelForm & {
  travelDate?: DateObject | null;
  travel_time?: string;
  final_destination?: string;
  passengers: ExtendedPassenger[];
};

type TravelFormProps = { ticketId: string };

const TravelForm: React.FC<TravelFormProps> = ({ ticketId }) => {
  const { showSuccess, showError, showInfo, handleApiError } = useApiNotification();
  const [flightId, setFlightId] = useState<string>("");
  const lastKeyRef = useRef<string>("");
  const inFlightRef = useRef<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [destinationTitleFa, setDestinationTitleFa] = useState<string>("");

  // Flight type state (ورودی/خروجی)
  const [flightType, setFlightType] = useState<"departures" | "arrivals">("departures");

  // React Hook Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(travelFormSchema),
    defaultValues: {
      airportName: "",
      flightNumber: "",
      travelDateGregorian: new DateObject().convert(gregorian).format("YYYY-MM-DD"),
      travelDate: new DateObject(),
      buyer_phone: "",
      buyer_email: "",
      order_comment: "",
      terminal_id: 1,
      cip_class_type: "class_a",
      final_destination: "",
      travel_time: "",
      pets: {},
      attendances: {},
      gateway: 4,
      payment_method: "zarinpal",
      passengers: [
        {
          name: "",
          lastName: "",
          nationalId: "",
          passportNumber: "",
          luggageCount: 0,
          passengerType: "adult",
          gender: "female",
          nationality: "iranian",
          description: "",
          attach_file: undefined,
        },
      ],
    },
  });

  // Field array for passengers
  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  // Watch form values for flight search
  const watchedValues = watch();

  // Fetch trip data once based on ticketId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!ticketId || ticketId === "0") return;
        const data = await fetchTrip(ticketId) as Partial<TicketInfo> & { passengers?: Passenger[] };

        const parsed = data.travelDate && typeof data.travelDate === "string" ? parseDate(data.travelDate) : (data.travelDate as DateObject | null | undefined) ?? null;
        
        const formData: FormData = {
          airportName: data.airportName || "",
          travelDate: parsed ?? new DateObject(),
          travelDateGregorian: parsed ? (parsed as DateObject).convert(gregorian).format("YYYY-MM-DD") : new DateObject().convert(gregorian).format("YYYY-MM-DD"),
          flightNumber: data.flightNumber || "",
          terminal_id: 1,
          cip_class_type: "class_a",
          final_destination: "",
          travel_time: "",
          pets: {},
          attendances: {},
          buyer_phone: data.buyer_phone || "",
          buyer_email: data.buyer_email || "",
          order_comment: "",
          gateway: 4,
          payment_method: "zarinpal",
          passengers: (data.passengers || [
            {
              name: "",
              lastName: "",
              nationalId: "",
              passportNumber: "",
              luggageCount: 0,
              passengerType: "adult" as const,
              gender: "female" as const,
              nationality: "iranian" as const,
            },
          ]).map((p: Passenger) => ({
            name: p.name || "",
            lastName: p.lastName || "",
            nationalId: p.nationalId || "",
            passportNumber: p.passportNumber || "",
            luggageCount: typeof p.luggageCount === 'number' ? p.luggageCount : parseInt(String(p.luggageCount || 0), 10),
            passengerType: p.passengerType || "adult" as const,
            gender: (p.gender as "male" | "female") || "female" as const,
            nationality: (p.nationality as "iranian" | "non_iranian" | "diplomat") || "iranian" as const,
            description: "",
            attach_file: undefined,
          })),
        };

        if (cancelled) return;
        reset(formData);
      } catch (e) {
        console.error("Failed to fetch trip:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId, reset]);

  // Automatic flight search when form loads with data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const flightNo = watchedValues.flightNumber;
        const dateStr = watchedValues.travelDateGregorian;
        const cipClass = watchedValues.cip_class_type;
        
        if (!flightNo || !dateStr) return;
        
        const key = `${flightNo}|${dateStr}|${flightType}|${cipClass}|1`;
        if (lastKeyRef.current === key) return;
        if (inFlightRef.current === key) return;
        
        inFlightRef.current = key;
        
        // Show searching notification
        showInfo("در حال جستجوی پرواز...", "جستجوی پرواز");

        const res = await findFlightByNumber(flightNo, dateStr, {
          cip_class: cipClass,
          expand: 1,
          flight_type_override: flightType,
        });
        
        if (!cancelled) {
          if (res?.success) {
            setFlightId(res.flight_id || "");
            
            // Extract date from scheduled_datetime (format: "2025-09-20 00:30:00")
            let flightDate = null;
            if (res.flight_info?.scheduled_datetime) {
              try {
                const dateStr = res.flight_info.scheduled_datetime.split(' ')[0]; // Get only date part
                flightDate = new DateObject(dateStr);
              } catch {
                console.warn('Failed to parse flight date:', res.flight_info.scheduled_datetime);
              }
            }
            
            // Update form values
            setValue("airportName", 
              (res.matched_item?.airport_from?.ap_title_fa as string | undefined) ||
              (res.flight_info?.departure as string | undefined) ||
              watchedValues.airportName
            );
            setValue("final_destination",
              (res.matched_item?.airport_to?.ap_iata as string | undefined) ||
              (res.flight_info?.arrival as string | undefined) ||
              watchedValues.final_destination
            );
            setValue("travel_time", res.flight_info?.departure_time || watchedValues.travel_time);
            if (flightDate) {
              setValue("travelDate", flightDate);
              setValue("travelDateGregorian", flightDate.convert(gregorian).format("YYYY-MM-DD"));
            }
            
            setDestinationTitleFa(
              (res.matched_item?.airport_to?.ap_title_fa as string | undefined) ||
              (res.destination_title_fa as string | undefined) ||
              ""
            );
            lastKeyRef.current = key;
            
            // Show success notification
            showSuccess(`پرواز ${flightNo} با موفقیت پیدا شد`, "پرواز آماده است");
          } else {
            setFlightId("");
            setValue("final_destination", "");
            setValue("travel_time", "");
            
            // Show error notification
            showError(`پرواز ${flightNo} در تاریخ ${dateStr} یافت نشد`, "پرواز پیدا نشد");
          }
        }
        
        inFlightRef.current = null;
      } catch (e) {
        console.error("Failed to search flight:", e);
        if (!cancelled) {
          showError("خطایی در جستجوی پرواز رخ داد", "خطا در جستجو");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [watchedValues.flightNumber, watchedValues.travelDateGregorian, watchedValues.cip_class_type, flightType, showInfo, showSuccess, showError, setValue]);

  // Manual flight search function
  const searchFlight = async () => {
    try {
      const flightNo = watchedValues.flightNumber;
      const dateStr = watchedValues.travelDateGregorian;
      const cipClass = watchedValues.cip_class_type;
      
      if (!flightNo || !dateStr) {
        showError("لطفاً شماره پرواز و تاریخ را وارد کنید", "اطلاعات ناقص");
        return;
      }
      
      const key = `${flightNo}|${dateStr}|${flightType}|${cipClass}|1`;
      if (lastKeyRef.current === key) return;
      if (inFlightRef.current === key) return;
      
      inFlightRef.current = key;
      
      // Show searching notification
      showInfo("در حال جستجوی پرواز...", "جستجوی پرواز");

      const res = await findFlightByNumber(flightNo, dateStr, {
        cip_class: cipClass,
        expand: 1,
        flight_type_override: flightType,
      });
      
      if (res?.success) {
        setFlightId(res.flight_id || "");
        
        // Extract date from scheduled_datetime (format: "2025-09-20 00:30:00")
        let flightDate = null;
        if (res.flight_info?.scheduled_datetime) {
          try {
            const dateStr = res.flight_info.scheduled_datetime.split(' ')[0]; // Get only date part
            flightDate = new DateObject(dateStr);
          } catch {
            console.warn('Failed to parse flight date:', res.flight_info.scheduled_datetime);
          }
        }
        
        // Update form values
        setValue("airportName", 
          (res.matched_item?.airport_from?.ap_title_fa as string | undefined) ||
          (res.flight_info?.departure as string | undefined) ||
          watchedValues.airportName
        );
        setValue("final_destination",
          (res.matched_item?.airport_to?.ap_iata as string | undefined) ||
          (res.flight_info?.arrival as string | undefined) ||
          watchedValues.final_destination
        );
        setValue("travel_time", res.flight_info?.departure_time || watchedValues.travel_time);
        if (flightDate) {
          setValue("travelDate", flightDate);
          setValue("travelDateGregorian", flightDate.convert(gregorian).format("YYYY-MM-DD"));
        }
        
        setDestinationTitleFa(
          (res.matched_item?.airport_to?.ap_title_fa as string | undefined) ||
          (res.destination_title_fa as string | undefined) ||
          ""
        );
        lastKeyRef.current = key;
        
        // Show success notification
        showSuccess(`پرواز ${flightNo} با موفقیت پیدا شد`, "پرواز آماده است");
      } else {
        setFlightId("");
        setValue("final_destination", "");
        setValue("travel_time", "");
        
        // Show error notification
        showError(`پرواز ${flightNo} در تاریخ ${dateStr} یافت نشد`, "پرواز پیدا نشد");
      }
      
      inFlightRef.current = null;
    } catch (e) {
      console.error("Failed to search flight:", e);
      showError("خطایی در جستجوی پرواز رخ داد", "خطا در جستجو");
    }
  };

  const handleDateChange = (date: DateObject | string | null) => {
    if (!date) {
      setValue("travelDate", null);
      setValue("travelDateGregorian", "");
      return;
    }
    const dateObj = date instanceof DateObject ? date : new DateObject(date);
    setValue("travelDate", dateObj);
    setValue("travelDateGregorian", dateObj ? dateObj.convert(gregorian).format("YYYY-MM-DD") : "");
  };

  const handleFileChange = (index: number, file: File | undefined) => {
    setValue(`passengers.${index}.attach_file`, file);
  };

  const addPassenger = () => {
    append({ 
      name: "", 
      lastName: "",
      nationalId: "",           
      passportNumber: "",
      luggageCount: 0,
      passengerType: "adult" as const,
      gender: "female" as const,
      nationality: "iranian" as const,
      description: "",
      attach_file: undefined,
    });
  };

  const removePassenger = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Check if flight_id is available
      if (!flightId) {
        showError("لطفاً ابتدا پرواز را جستجو کنید", "خطا");
        return;
      }

      // Call CIP API
      // Create order (server proxy)
      const orderResult = await createOrder({
        flight_id: flightId || undefined,
        flight_date: data.travelDateGregorian || undefined,
        flight_number: data.flightNumber || undefined,
        order_email: data.buyer_email,
        order_mobile: data.buyer_phone,
        order_comment: data.order_comment,
        order_type: 'core',
        cip_class: (data.cip_class_type === 'class_b' ? 'class_b' : 'class_a'),
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error || "خطا در ایجاد سفارش");
      }

      showSuccess(orderResult.message || "افزودن مسافران...", "سفارش ایجاد شد");

      // Register passengers sequentially
      const orderId = orderResult.data?.order_id as string | undefined;
      if (orderId) {
        for (const p of data.passengers) {
          const passengerRes = await createPassenger({
            order_id: orderId,
            first_name: p.name,
            last_name: p.lastName || "",
            alt_name: `${p.name || ''} ${p.lastName || ''}`.trim(),
            mobile_number: data.buyer_phone,
            final_destination: data.final_destination || "",
            passport_number: p.passportNumber || "",
            bag_count: Number(p.luggageCount) || 0,
            passen_type: p.passengerType,
            gender: p.gender as "male" | "female",
            // Map UI values to API accepted values
            passen_nationality: p.nationality === 'iranian' ? 'iranian' : 'not_iranian',
            melicode: p.nationalId,
          });
          console.log('passengerRes', passengerRes);
          if (!passengerRes.success) {
            showError(passengerRes.message || passengerRes.error || `خطا در ثبت مسافر ${p.name}`, "خطا در ثبت مسافر");
            throw new Error(passengerRes.error || passengerRes.message || `خطا در ثبت مسافر ${p.name}`);
          }
        }
        const prices = await getOrderPrices(orderId);
        
        if (prices.success && prices.data) {
          setTotalAmount(prices.data.total_order_amount);
          setCreatedOrderId(orderId); // Enable payment button
          showInfo(`${prices.data.total_order_amount.toLocaleString()} ریال`, "مبلغ کل سفارش");
          
          // Update trip with order ID
          const updateResult = await updateTrip({
            trip_id: ticketId,
            order_id: orderId,
            airportName: data.airportName,
            travelType: flightType === "departures" ? "departure" : "arrival",
            travelDate: data.travelDateGregorian,
            flightNumber: data.flightNumber,
            flightId: flightId,
            buyer_phone: data.buyer_phone,
            buyer_email: data.buyer_email,
            passengers: data.passengers.map(p => ({
              name: p.name,
              lastName: p.lastName,
              nationalId: p.nationalId,
              passportNumber: p.passportNumber || "",
              luggageCount: p.luggageCount,
              passengerType: p.passengerType,
              gender: p.gender,
              nationality: p.nationality,
            })),
            passengerCount: data.passengers.length.toString(),
            additionalInfo: data.order_comment,
            flightType: data.cip_class_type,
            cip_class_type: data.cip_class_type,
            order_comment: data.order_comment,
            payment_method: data.payment_method,
          });
          
          if (updateResult.success) {
            showSuccess("اطلاعات سفر با موفقیت به‌روزرسانی شد", "به‌روزرسانی موفق");
          } else {
            showError(updateResult.error || "خطا در به‌روزرسانی سفر", "خطا در به‌روزرسانی");
          }
        } else if (!prices.success) {
          console.warn('Failed to fetch prices', prices.error);
        }
      }
    } catch (error) {
      console.error('Error submitting to CIP API:', error);
      handleApiError(error, "مشکلی در ارسال اطلاعات پیش آمد");
    }
  };

  const handlePay = async () => {
    try {
      if (!createdOrderId) {
        showError("لطفاً ابتدا سفارش را ثبت کنید", "سفارش نامعتبر");
        return;
      }
      
      const linkRes = await getPaymentLinkNew(createdOrderId);
      if (linkRes.success && linkRes.payment_link) {
        // Open payment link in new tab
        window.open(linkRes.payment_link, '_blank');
        showSuccess("لینک پرداخت در تب جدید باز شد", "پرداخت");
      } else {
        throw new Error(linkRes.error || "لینک پرداخت دریافت نشد");
      }
    } catch (error) {
      console.error('Error on pay', error);
      handleApiError(error, "مشکلی در دریافت لینک پرداخت رخ داد");
    }
  };

  // handleSearchFlight function removed - flight search is now automatic in page.tsx

  

  return (
    <div className="bg-navy-dark min-h-screen" dir="rtl">
      <div className="p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* Header */}
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-lg">
            <CardHeader className="text-center p-4 sm:p-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <Plane className="text-golden-accent w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-center bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent">
                  فرم اطلاعات سفر
                </span>
                <Plane className="text-golden-accent w-6 h-6 sm:w-8 sm:h-8" />
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Flight Information */}
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
                <Calendar className="text-golden-accent w-5 h-5 sm:w-6 sm:h-6" />
                اطلاعات پرواز
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="airport" className="text-white">
                    نام فرودگاه
                  </Label>
                  <Input
                    id="airport"
                    {...register("airportName")}
                    className={`bg-input border-golden-accent text-foreground ${
                      errors.airportName ? "border-red-500" : ""
                    }`}
                  />
                  {errors.airportName && (
                    <p className="text-red-400 text-sm">{errors.airportName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flightNumber" className="text-white">
                    شماره پرواز
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="flightNumber"
                      {...register("flightNumber")}
                      className={`bg-input border-golden-accent text-foreground flex-1 ${
                        errors.flightNumber ? "border-red-500" : ""
                      }`}
                      placeholder="مثال: IR123"
                    />
                  
                  </div>
                  {flightId ? (
                    <div className="text-green-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      پرواز آماده است
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      شماره پرواز و تاریخ را وارد کرده و دکمه جستجو را بزنید
                    </div>
                  )}
                  {errors.flightNumber && (
                    <p className="text-red-400 text-sm">{errors.flightNumber.message}</p>
                  )}
                </div>


                <div className="space-y-2">
                  <Label htmlFor="flight_type" className="text-white">
                    نوع سفر
                  </Label>
                  <select
                    id="flight_type"
                    value={flightType}
                    onChange={(e) => setFlightType(e.target.value as "departures" | "arrivals")}
                    className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                  >
                    <option value="departures">خروجی</option>
                    <option value="arrivals">ورودی</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cip_class_type" className="text-white">
                    نوع کلاس CIP
                  </Label>
                  <select
                    id="cip_class_type"
                    {...register("cip_class_type")}
                    className={`bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full ${
                      errors.cip_class_type ? "border-red-500" : ""
                    }`}
                  >
                    <option value="class_a">Class A</option>
                    <option value="class_b">Class B</option>
                  </select>
                  {errors.cip_class_type && (
                    <p className="text-red-400 text-sm">{errors.cip_class_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final_destination" className="text-white">
                    مقصد نهایی
                  </Label>
                  <div className="flex gap-2">
                  <Input
                    id="final_destination"
                      value={destinationTitleFa || ""}
                      readOnly
                      className="bg-gray-600 border-golden-accent text-gray-300 flex-1 cursor-not-allowed"
                      placeholder="نام مقصد (فارسی) - از API دریافت می‌شود"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travel_time" className="text-white">
                    زمان سفر
                  </Label>
                  <Input
                    id="travel_time"
                    value={watchedValues.travel_time || ""}
                    readOnly
                    className="bg-gray-600 border-golden-accent text-gray-300 cursor-not-allowed"
                    placeholder="HH:MM - از API دریافت می‌شود"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">تاریخ سفر</Label>
                  <div className="relative">
                    <Controller
                      name="travelDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          calendar={gregorian}
                          locale={gregorian_en}
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            handleDateChange(date);
                          }}
                          style={{
                            width: "100%",
                            height: "40px",
                            backgroundColor: "oklch(0.922 0 0)",
                            border: errors.travelDateGregorian ? "1px solid #ef4444" : "1px solid oklch(0.85 0.15 85)",
                            borderRadius: "var(--radius)",
                            color: "oklch(var(--foreground))",
                            padding: "0 12px",
                          }}
                          placeholder="Select date (Gregorian)"
                        />
                      )}
                    />
                  </div>
                  {errors.travelDateGregorian && (
                    <p className="text-red-400 text-sm">{errors.travelDateGregorian.message}</p>
                  )}
                </div>
                
                
              </div>
              <div className=" flex justify-end">
              <Button
                      type="button"
                      onClick={searchFlight}
                      disabled={!watchedValues.flightNumber || !watchedValues.travelDateGregorian}
                      className="bg-golden-accent text-accent-foreground hover:bg-golden-accent/80 px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      جستجو
                </Button>

              </div>
            </CardContent>
          </Card>

          {/* Buyer Information */}
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
                <CreditCard className="text-golden-accent w-5 h-5 sm:w-6 sm:h-6" />
                اطلاعات خریدار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer_phone" className="text-white">
                    شماره تلفن خریدار
                  </Label>
                  <div className="flex items-center gap-2">
                    <Phone className="text-golden-accent w-4 h-4" />
                    <Input
                      id="buyer_phone"
                      {...register("buyer_phone")}
                      className={`bg-input border-golden-accent text-foreground ${
                        errors.buyer_phone ? "border-red-500" : ""
                      }`}
                      placeholder="09121234567"
                    />
                  </div>
                  {errors.buyer_phone && (
                    <p className="text-red-400 text-sm">{errors.buyer_phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer_email" className="text-white">
                    ایمیل خریدار
                  </Label>
                  <div className="flex items-center gap-2">
                    <Mail className="text-golden-accent w-4 h-4" />
                    <Input
                      id="buyer_email"
                      type="email"
                      {...register("buyer_email")}
                      className={`bg-input border-golden-accent text-foreground ${
                        errors.buyer_email ? "border-red-500" : ""
                      }`}
                      placeholder="example@email.com"
                    />
                  </div>
                  {errors.buyer_email && (
                    <p className="text-red-400 text-sm">{errors.buyer_email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_comment" className="text-white">
                  توضیحات سفارش
                </Label>
                <div className="flex items-start gap-2">
                  <FileText className="text-golden-accent w-4 h-4 mt-2" />
                  <Textarea
                    id="order_comment"
                    {...register("order_comment")}
                    className="bg-input border-golden-accent text-foreground min-h-[80px]"
                    placeholder="توضیحات اضافی درباره سفارش..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passengers Section */}
          <Card className=" border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="text-golden-accent w-5 h-5 sm:w-6 sm:h-6" />
                  <span>مسافران</span>
                  <Badge
                    variant="secondary"
                    className="bg-golden-accent text-accent-foreground shadow-course"
                  >
                    {fields.length} نفر
                  </Badge>
                </div>
                <Button
                  onClick={addPassenger}
                  size="sm"
                  className=" text-accent-foreground text-sm shadow-course transition-transform duration-300 ease-out hover:scale-105 border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)]"
                >
                  <Plus className="w-4 h-4 ml-1 text-white" />
                  <span className="hidden sm:inline bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent text-lg">
                    افزودن مسافر
                  </span>
                  <span className="sm:hidden bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent">
                    افزودن
                  </span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              {fields.map((field, index) => (
                <Card
                  key={index}
                  className=" bg-[#0e1222] text-white p-4 rounded-xl border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)] hover:scale-[1.02] transition-all ease-out duration-1000 shadow-110"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-white sm:text-lg font-semibold text-foreground">
                        مسافر {index + 1}
                      </h4>
                      {fields.length > 1 && (
                        <Button
                          onClick={() => removePassenger(index)}
                          size="sm"
                          variant="destructive"
                          className="text-xs sm:text-sm"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline mr-1">حذف</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                             <div className="space-y-2">
                         <Label className="text-white">
                           نام
                         </Label>
                         <Input
                           {...register(`passengers.${index}.name`)}
                           className={`bg-input border-golden-accent text-black ${
                             errors.passengers?.[index]?.name ? "border-red-500" : ""
                           }`}
                           placeholder="نام"
                         />
                         {errors.passengers?.[index]?.name && (
                           <p className="text-red-400 text-sm">{errors.passengers[index]?.name?.message}</p>
                         )}
                       </div>

                       <div className="space-y-2">
                         <Label className="text-white">
                           نام خانوادگی
                         </Label>
                         <Input
                           {...register(`passengers.${index}.lastName`)}
                           className={`bg-input border-golden-accent text-black ${
                             errors.passengers?.[index]?.lastName ? "border-red-500" : ""
                           }`}
                           placeholder="نام خانوادگی"
                         />
                         {errors.passengers?.[index]?.lastName && (
                           <p className="text-red-400 text-sm">{errors.passengers[index]?.lastName?.message}</p>
                         )}
                       </div>

                                             <div className="space-y-2">
                         <Label className="text-white">کد ملی</Label>
                         <Input
                           {...register(`passengers.${index}.nationalId`)}
                           className={`bg-input border-golden-accent text-foreground ${
                             errors.passengers?.[index]?.nationalId ? "border-red-500" : ""
                           }`}
                           placeholder="کد ملی ۱۰ رقمی"
                           maxLength={10}
                         />
                         {errors.passengers?.[index]?.nationalId && (
                           <p className="text-red-400 text-sm">{errors.passengers[index]?.nationalId?.message}</p>
                         )}
                       </div>

                       {/* <div className="space-y-2">
                         <Label className="text-white">شماره پرواز</Label>
                         <Input
                           value={passenger.flightNumber}
                           onChange={(e) =>
                             handlePassengerChange(
                               index,
                               "flightNumber",
                               e.target.value,
                             )
                           }
                           className="bg-input border-golden-accent text-foreground"
                           placeholder="شماره پرواز"
                         />
                       </div> */}

                       <div className="space-y-2">
                         <Label className="text-white">شماره پاسپورت</Label>
                         <Input
                           {...register(`passengers.${index}.passportNumber`)}
                           className="bg-input border-golden-accent text-foreground"
                           placeholder="شماره پاسپورت"
                         />
                       </div>

                                             <div className="space-y-2">
                         <Label className="text-white">جنسیت</Label>
                         <select
                           {...register(`passengers.${index}.gender`)}
                           className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                         >
                           <option value="female">زن</option>
                           <option value="male">مرد</option>
                         </select>
                       </div>

                       <div className="space-y-2">
                         <Label className="text-white">نوع مسافر</Label>
                         <select
                           {...register(`passengers.${index}.passengerType`)}
                           className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                         >
                           <option value="adult">بزرگسال</option>
                           <option value="infant">نوزاد</option>
                         </select>
                       </div>

                       <div className="space-y-2">
                         <Label className="text-white">ملیت</Label>
                         <select
                           {...register(`passengers.${index}.nationality`)}
                           className={`bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full ${
                             errors.passengers?.[index]?.nationality ? "border-red-500" : ""
                           }`}
                         >
                           <option value="iranian">ایرانی</option>
                           <option value="non_iranian">غیر ایرانی</option>
                           <option value="diplomat">دیپلمات</option>
                         </select>
                         {errors.passengers?.[index]?.nationality && (
                           <p className="text-red-400 text-sm">{errors.passengers[index]?.nationality?.message}</p>
                         )}
                       </div>

                      <div className="space-y-2">
                        <Label className="text-white text-sm">
                          تعداد بار
                        </Label>
                        <div className="flex items-center space-x-2 space-x-reverse justify-center sm:justify-start">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentValue = watchedValues.passengers[index]?.luggageCount ?? 0;
                              setValue(`passengers.${index}.luggageCount`, Math.max(0, currentValue - 1));
                            }}
                            className="border-golden-accent text-foreground hover:bg-golden-accent hover:text-accent-foreground h-8 w-8 p-0 transition-transform duration-300 ease-out hover:scale-110"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <span className="text-lg sm:text-xl font-semibold text-white w-8 sm:w-10 text-center">
                            {String(watchedValues.passengers[index]?.luggageCount ?? 0)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentValue = watchedValues.passengers[index]?.luggageCount ?? 0;
                              setValue(`passengers.${index}.luggageCount`, currentValue + 1);
                            }}
                            className="border-golden-accent text-foreground hover:bg-golden-accent hover:text-accent-foreground h-8 w-8 p-0 transition-transform duration-300 ease-out hover:scale-110"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">توضیحات</Label>
                        <Textarea
                          {...register(`passengers.${index}.description`)}
                          className="bg-input border-golden-accent text-foreground min-h-[60px]"
                          placeholder="توضیحات اضافی..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">فایل پیوست</Label>
                        <div className="flex items-center gap-3">
                          <input
                          type="file"
                            id={`file-${index}`}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleFileChange(
                              index,
                              e.target.files?.[0] || undefined,
                            )
                          }
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          />
                          <label
                            htmlFor={`file-${index}`}
                            className="px-4 py-2 bg-golden-accent text-accent-foreground rounded-md cursor-pointer hover:bg-golden-accent/80 transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            انتخاب فایل
                          </label>
                          <span className="text-gray-300 text-sm flex-1">
                            {watchedValues.passengers[index]?.attach_file?.name || "هیچ فایلی انتخاب نشده"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Payment Method */}
          {/* <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
                <CreditCard className="text-golden-accent w-5 h-5 sm:w-6 sm:h-6" />
                روش پرداخت
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <input
                    type="radio"
                    id="zarinpal"
                    name="payment_method"
                    value="zarinpal"
                    checked={travelData.payment_method === "zarinpal"}
                    onChange={(e) => handleBasicInfoChange("payment_method", e.target.value)}
                    className="w-4 h-4 text-golden-accent bg-input border-golden-accent focus:ring-golden-accent"
                  />
                  <label htmlFor="zarinpal" className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                      <span className="text-black font-bold text-sm">Z</span>
                    </div>
                    <span className="text-white">زرین پال</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                  <input
                    type="radio"
                    id="saman"
                    name="payment_method"
                    value="saman"
                    checked={travelData.payment_method === "saman"}
                    onChange={(e) => handleBasicInfoChange("payment_method", e.target.value)}
                    className="w-4 h-4 text-golden-accent bg-input border-golden-accent focus:ring-golden-accent"
                  />
                  <label htmlFor="saman" className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">سامان</span>
                    </div>
                    <span className="text-white">بانک سامان</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                  <input
                    type="radio"
                    id="wallet"
                    name="payment_method"
                    value="wallet"
                    checked={travelData.payment_method === "wallet"}
                    onChange={(e) => handleBasicInfoChange("payment_method", e.target.value)}
                    className="w-4 h-4 text-golden-accent bg-input border-golden-accent focus:ring-golden-accent"
                  />
                  <label htmlFor="wallet" className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">کیف پول</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-4 p-4 border-golden-accent border bg-[#0d0c1d] shadow-course">
                        
            <div className="flex items-center gap-3">
              {totalAmount != null && (
                <span className="text-white text-sm sm:text-base">
                  مبلغ قابل پرداخت: <strong className="text-golden-accent">{totalAmount.toLocaleString()} ریال</strong>
                </span>
              )}
            <Button
                type="submit"
                disabled={isSubmitting}
              size="lg"
                className=" text-accent-foreground text-sm shadow-course transition-transform duration-300 ease-out hover:scale-105 border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent text-base sm:text-lg">
                  {isSubmitting ? "در حال ثبت..." : "ثبت سفارش"}
                </span>
            </Button>
            <Button
                onClick={handlePay}
              size="lg"
                disabled={!createdOrderId || !(totalAmount && totalAmount > 0)}
              className=" text-accent-foreground text-sm shadow-course transition-transform duration-300 ease-out hover:scale-105 border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent text-base sm:text-lg">
                پرداخت نهایی
              </span>
            </Button>
            </div>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TravelForm;
