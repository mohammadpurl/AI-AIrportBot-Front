"use client";
import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

import React, { useEffect, useRef, useState } from "react";
 
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
import { createOrder, createPassenger, getOrderPrices, getPaymentLink, fetchTrip, findFlightByNumber } from "@/services/api";

// Extended Passenger interface with additional fields
interface ExtendedPassenger extends Passenger {
  description: string;
  attach_file?: File;
  // nationality is already in Passenger interface
}

// Extended TicketInfo interface (override conflicting fields)
type ExtendedTicketInfo = Omit<TicketInfo, "travelDate" | "passengers"> & {
  // allow DateObject for client form usage (client-only)
  travelDate?: string | DateObject | null;
  // store Gregorian travel date (YYYY-MM-DD)
  travelDateGregorian?: string;
  terminal_id: number;
  cip_class_type: "class_a" | "class_b";
  final_destination: string;
  travel_time?: string;
  pets: { [key: string]: number };
  attendances: { [key: string]: number };
  buyer_phone: string;
  buyer_email: string;
  order_comment: string;
  gateway: number;
  payment_method: "zarinpal" | "saman" | "wallet";
  passengers: ExtendedPassenger[];
};

type TravelFormProps = { ticketId: string };

  const TravelForm: React.FC<TravelFormProps> = ({ ticketId }) => {
  const { showSuccess, showError, showInfo, handleApiResponse, handleApiError } = useApiNotification();
  const [flightId, setFlightId] = useState<string>("");
  const lastKeyRef = useRef<string>("");
  const inFlightRef = useRef<string | null>(null);
    const [createdOrderId] = useState<string | null>(null);
    const [totalAmount, setTotalAmount] = useState<number | null>(null);
    const [destinationTitleFa, setDestinationTitleFa] = useState<string>("");

  const [travelData, setTravelData] = useState<ExtendedTicketInfo>({
    airportName: "",
    travelDate: null,
    travelDateGregorian: "",
    flightNumber: "",
    terminal_id: 1,
    cip_class_type: "class_a",
    final_destination: "",
    travel_time: "",
    pets: {},
    attendances: {},
    buyer_phone: "",
    buyer_email: "",
    order_comment: "",
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
  });

  // Flight type state (ورودی/خروجی)
  const [flightType, setFlightType] = useState<"departures" | "arrivals">("departures");

  // Fetch trip data once based on ticketId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!ticketId || ticketId === "0") return;
        const data = await fetchTrip(ticketId) as Partial<TicketInfo> & { passengers?: Passenger[] };

        const parsed = data.travelDate && typeof data.travelDate === "string" ? parseDate(data.travelDate) : (data.travelDate as DateObject | null | undefined) ?? null;
        debugger;
        const next: ExtendedTicketInfo = {
          airportName: data.airportName || "",
          travelDate: parsed ?? null,
          travelDateGregorian: parsed ? (parsed as DateObject).convert(gregorian).format("YYYY-MM-DD") : "",
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
              passengerType: "adult",
              gender: "female",
              nationality: "iranian",
            },
          ]).map((p: Passenger) => ({
      ...p,
      description: "",
      attach_file: undefined,
            nationality: p.nationality || "iranian",
          })),
        } as ExtendedTicketInfo;

        if (cancelled) return;
        setTravelData(next);
      } catch (e) {
        console.error("Failed to fetch trip:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

  // Search flight when flight number, date, class, or flight type changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const flightNo = travelData.flightNumber;
        const dateStr = travelData.travelDateGregorian;
        const cipClass = travelData.cip_class_type;
        
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
            setTravelData(prev => ({
              ...prev,
              // Prefer IATA code from airport_to.ap_iata, then arrival (which we map to iata when present), then keep previous
              final_destination:
                (res.matched_item?.airport_to?.ap_iata as string | undefined) ||
                (res.flight_info?.arrival as string | undefined) ||
                prev.final_destination,
              travel_time: res.flight_info?.departure_time || prev.travel_time,
            }));
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
            setTravelData(prev => ({
              ...prev,
              final_destination: "",
              travel_time: "",
            }));
            
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
  }, [travelData.flightNumber, travelData.travelDateGregorian, travelData.cip_class_type, flightType]);

  const handleBasicInfoChange = (
    field: keyof Pick<ExtendedTicketInfo, "airportName" | "flightNumber" | "cip_class_type" | "final_destination" | "travel_time" | "buyer_phone" | "buyer_email" | "order_comment" | "payment_method">,
    value: string | number,
  ) => {
    setTravelData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (date: DateObject | string | null) => {
    if (!date) {
      setTravelData((prev) => ({
        ...prev,
        travelDate: null,
        travelDateGregorian: "",
      }));
      return;
    }
    const dateObj = date instanceof DateObject ? date : new DateObject(date);
    setTravelData((prev) => ({
      ...prev,
      travelDate: dateObj,
      travelDateGregorian: dateObj ? dateObj.convert(gregorian).format("YYYY-MM-DD") : "",
    }));
  };

  const handlePassengerChange = (
    index: number,
    field: keyof ExtendedPassenger,
    value: string | number | File,
  ) => {
    setTravelData((prev): ExtendedTicketInfo => ({
      ...prev,
      passengers: prev.passengers.map((passenger, i) => {
        if (i !== index) return passenger;
        return { ...passenger, [field]: value } as ExtendedPassenger;
      }),
    }));
  };

 

  const handleFileChange = (index: number, file: File | undefined) => {
    setTravelData((prev): ExtendedTicketInfo => ({
      ...prev,
      passengers: prev.passengers.map((passenger, i) => {
        if (i !== index) return passenger;
        return { ...passenger, attach_file: file } as ExtendedPassenger;
      }),
    }));
  };

  const addPassenger = () => {
    setTravelData((prev) => ({
      ...prev,
      passengers: [
        ...prev.passengers,
        { 
          name: "", 
          lastName: "",
          nationalId: "",           
          passportNumber: "",
          luggageCount: 0,
          passengerType: "adult" as const,
          gender: "female" as const,
          nationality: "iranian" as const, // ایرانی، غیر ایرانی، دیپلمات
          description: "",
          attach_file: undefined,
        },
      ],
    }));
  };

  const removePassenger = (index: number) => {
    if (travelData.passengers.length > 1) {
      setTravelData((prev): ExtendedTicketInfo => ({
        ...prev,
        passengers: prev.passengers.filter((_, i) => i !== index) as ExtendedPassenger[],
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Resolve Gregorian flight date (YYYY-MM-DD)
      debugger;
      let flyDate = travelData.travelDateGregorian || "";
      if (!flyDate && travelData.travelDate) {
        try {
          const dateObj = travelData.travelDate instanceof DateObject
            ? travelData.travelDate
            : new DateObject(travelData.travelDate as unknown as string);
          flyDate = dateObj.convert(gregorian).format("YYYY-MM-DD");
        } catch {
          // ignore conversion errors
        }
      }

      // Check if flight_id is available
      if (!flightId) {
        showError("لطفاً ابتدا پرواز را جستجو کنید", "خطا");
        return;
      }

      // reservationData removed (legacy flow)

      // Call CIP API
      // Create order (server proxy)
      const orderResult = await createOrder({
        flight_id: flightId || undefined,
        flight_date: travelData.travelDateGregorian || undefined,
        flight_number: travelData.flightNumber || undefined,
        order_email: travelData.buyer_email,
        order_mobile: travelData.buyer_phone,
        order_comment: travelData.order_comment,
        order_type: 'core',
        cip_class: (travelData.cip_class_type === 'class_b' ? 'class_b' : 'class_a'),
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error || "خطا در ایجاد سفارش");
      }

      showSuccess(orderResult.message || "افزودن مسافران...", "سفارش ایجاد شد");

      // Register passengers sequentially
      const orderId = orderResult.data?.order_id as string | undefined;
      if (orderId) {
        for (const p of travelData.passengers) {
          const passengerRes = await createPassenger({
            order_id: orderId,
            first_name: p.name,
            last_name: p.lastName || "",
            alt_name: `${p.name || ''} ${p.lastName || ''}`.trim(),
            mobile_number: travelData.buyer_phone,
            final_destination: travelData.final_destination || "",
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
          showInfo(`${prices.data.total_order_amount.toLocaleString()} ریال`, "مبلغ کل سفارش");
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
      const linkRes = await getPaymentLink(createdOrderId);
      if (linkRes.success && linkRes.payment_link) {
        window.location.href = linkRes.payment_link;
          return;
        }
      throw new Error(linkRes.error || "لینک پرداخت دریافت نشد");
    } catch (error) {
      console.error('Error on pay', error);
      handleApiError(error, "مشکلی رخ داد");
    }
  };

  // handleSearchFlight function removed - flight search is now automatic in page.tsx

  

  return (
    <div className="bg-navy-dark min-h-screen" dir="rtl">
      <div className="p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-8">
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
                    value={travelData.airportName}
                    onChange={(e) =>
                      handleBasicInfoChange("airportName", e.target.value)
                    }
                    className="bg-input border-golden-accent text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flightNumber" className="text-white">
                    شماره پرواز
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="flightNumber"
                      value={travelData.flightNumber}
                      onChange={(e) =>
                        handleBasicInfoChange("flightNumber", e.target.value)
                      }
                      className="bg-input border-golden-accent text-foreground flex-1"
                      placeholder="مثال: IR123"
                    />
                    {flightId ? (
                      <div className="text-green-400 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        پرواز آماده است
                  </div>
                    ) : travelData.flightNumber ? (
                      <div className="text-yellow-400 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        در حال جستجو...
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        شماره پرواز را وارد کنید
                    </div>
                  )}
                  </div>
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
                    value={travelData.cip_class_type}
                    onChange={(e) =>
                      handleBasicInfoChange("cip_class_type", e.target.value)
                    }
                    className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                  >
                    <option value="class_a">Class A</option>
                    <option value="class_b">Class B</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final_destination" className="text-white">
                    مقصد نهایی
                  </Label>
                  <div className="flex gap-2">
                  <Input
                    id="final_destination"
                      value={destinationTitleFa || ""}
                      onChange={(e) => setDestinationTitleFa(e.target.value)}
                      className="bg-input border-golden-accent text-foreground flex-1"
                      placeholder="نام مقصد (فارسی)"
                    />
                    {/* <Input
                    value={travelData.final_destination}
                      onChange={(e) => handleBasicInfoChange("final_destination", e.target.value)}
                      className="bg-input border-golden-accent text-foreground w-28"
                      placeholder="IATA"
                    /> */}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travel_time" className="text-white">
                    زمان سفر
                  </Label>
                  <Input
                    id="travel_time"
                    value={travelData.travel_time || ""}
                    onChange={(e) =>
                      handleBasicInfoChange("travel_time", e.target.value)
                    }
                    className="bg-input border-golden-accent text-foreground"
                    placeholder="HH:MM"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">تاریخ سفر</Label>
                  <div className="relative">
                    <DatePicker
                      calendar={gregorian}
                      locale={gregorian_en}
                      value={travelData.travelDate}
                      onChange={handleDateChange}
                      style={{
                        width: "100%",
                        height: "40px",
                        backgroundColor: "oklch(0.922 0 0)",
                        border: "1px solid oklch(0.85 0.15 85)",
                        borderRadius: "var(--radius)",
                        color: "oklch(var(--foreground))",
                        padding: "0 12px",
                      }}
                      placeholder="Select date (Gregorian)"
                    />
                  </div>
                </div>

                
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
                      value={travelData.buyer_phone}
                      onChange={(e) =>
                        handleBasicInfoChange("buyer_phone", e.target.value)
                      }
                      className="bg-input border-golden-accent text-foreground"
                      placeholder="09121234567"
                    />
                  </div>
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
                      value={travelData.buyer_email}
                      onChange={(e) =>
                        handleBasicInfoChange("buyer_email", e.target.value)
                      }
                      className="bg-input border-golden-accent text-foreground"
                      placeholder="example@email.com"
                    />
                  </div>
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
                    value={travelData.order_comment}
                    onChange={(e) =>
                      handleBasicInfoChange("order_comment", e.target.value)
                    }
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
                    {travelData.passengers.length} نفر
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
              {travelData.passengers.map((passenger, index) => (
                <Card
                  key={index}
                  className=" bg-[#0e1222] text-white p-4 rounded-xl border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)] hover:scale-[1.02] transition-all ease-out duration-1000 shadow-110"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-white sm:text-lg font-semibold text-foreground">
                        مسافر {index + 1}
                      </h4>
                      {travelData.passengers.length > 1 && (
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
                           value={passenger.name}
                           onChange={(e) =>
                             handlePassengerChange(
                               index,
                               "name",
                               e.target.value,
                             )
                           }
                           className="bg-input border-golden-accent text-black"
                           placeholder="نام"
                         />
                       </div>

                       <div className="space-y-2">
                         <Label className="text-white">
                           نام خانوادگی
                         </Label>
                         <Input
                           value={passenger.lastName}
                           onChange={(e) =>
                             handlePassengerChange(
                               index,
                               "lastName",
                               e.target.value,
                             )
                           }
                           className="bg-input border-golden-accent text-black"
                           placeholder="نام خانوادگی"
                         />
                       </div>

                                             <div className="space-y-2">
                         <Label className="text-white">کد ملی</Label>
                         <Input
                           value={passenger.nationalId}
                           onChange={(e) =>
                             handlePassengerChange(
                               index,
                               "nationalId",
                               e.target.value,
                             )
                           }
                           className="bg-input border-golden-accent text-foreground"
                           placeholder="کد ملی ۱۰ رقمی"
                           maxLength={10}
                         />
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
                           value={passenger.passportNumber}
                           onChange={(e) =>
                             handlePassengerChange(
                               index,
                               "passportNumber",
                               e.target.value,
                             )
                           }
                           className="bg-input border-golden-accent text-foreground"
                           placeholder="شماره پاسپورت"
                         />
                       </div>

                                             <div className="space-y-2">
                         <Label className="text-white">جنسیت</Label>
                         <select
                           value={passenger.gender}
                           onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                             handlePassengerChange(
                               index,
                               "gender",
                               e.target.value as "male" | "female",
                             )
                           }
                           className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                         >
                           <option value="female">زن</option>
                           <option value="male">مرد</option>
                         </select>
                       </div>

                       <div className="space-y-2">
                         <Label className="text-white">نوع مسافر</Label>
                         <select
                           value={passenger.passengerType}
                           onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                             handlePassengerChange(
                               index,
                               "passengerType",
                               e.target.value as "adult" | "infant",
                             )
                           }
                           className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                         >
                           <option value="adult">بزرگسال</option>
                           <option value="infant">نوزاد</option>
                         </select>
                       </div>

                       <div className="space-y-2">
                         <Label className="text-white">ملیت</Label>
                         <select
                           value={passenger.nationality}
                           onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                             handlePassengerChange(
                               index,
                               "nationality",
                               e.target.value as "iranian" | "non_iranian" | "diplomat",
                             )
                           }
                           className="bg-input border-golden-accent text-foreground px-3 py-2 rounded-md w-full"
                         >
                           <option value="iranian">ایرانی</option>
                           <option value="non_iranian">غیر ایرانی</option>
                           <option value="diplomat">دیپلمات</option>
                         </select>
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
                            onClick={() =>
                              handlePassengerChange(
                                index,
                                "luggageCount",
                                Math.max(0, Number(passenger.luggageCount ?? 0) - 1),
                              )
                            }
                            className="border-golden-accent text-foreground hover:bg-golden-accent hover:text-accent-foreground h-8 w-8 p-0 transition-transform duration-300 ease-out hover:scale-110"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <span className="text-lg sm:text-xl font-semibold text-white w-8 sm:w-10 text-center">
                            {String(passenger.luggageCount ?? 0)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePassengerChange(
                                index,
                                "luggageCount",
                                Number(passenger.luggageCount ?? 0) + 1,
                              )
                            }
                            className="border-golden-accent text-foreground hover:bg-golden-accent hover:text-accent-foreground h-8 w-8 p-0 transition-transform duration-300 ease-out hover:scale-110"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">توضیحات</Label>
                        <Textarea
                          value={passenger.description}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
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
                            {travelData.passengers[index].attach_file?.name || "هیچ فایلی انتخاب نشده"}
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
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
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
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-4 p-4 border-golden-accent border bg-[#0d0c1d] shadow-course">
                        
            <div className="flex items-center gap-3">
              {totalAmount != null && (
                <span className="text-white text-sm sm:text-base">
                  مبلغ قابل پرداخت: <strong className="text-golden-accent">{totalAmount.toLocaleString()} ریال</strong>
                </span>
              )}
            <Button
                onClick={handleSubmit}
              size="lg"
                className=" text-accent-foreground text-sm shadow-course transition-transform duration-300 ease-out hover:scale-105 border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent text-base sm:text-lg">
                  ثبت سفارش
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
        </div>
      </div>
    </div>
  );
};

export default TravelForm;
