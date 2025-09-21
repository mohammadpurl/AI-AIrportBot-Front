import { z } from "zod";

// Validation schema for passenger data
export const passengerSchema = z.object({
  name: z.string().min(1, "نام اجباری است"),
  lastName: z.string().min(1, "نام خانوادگی اجباری است"),
  nationalId: z.string()
    .min(10, "کد ملی باید ۱۰ رقم باشد")
    .max(10, "کد ملی باید ۱۰ رقم باشد")
    .regex(/^\d{10}$/, "کد ملی باید فقط شامل اعداد باشد"),
  passportNumber: z.string().optional(),
  luggageCount: z.number().min(0, "تعداد بار نمی‌تواند منفی باشد"),
  passengerType: z.enum(["adult", "infant"]),
  gender: z.enum(["male", "female"]),
  nationality: z.enum(["iranian", "non_iranian", "diplomat"]),
  description: z.string().optional(),
  attach_file: z.any().optional(),
});

// Validation schema for travel form
export const travelFormSchema = z.object({
  // Flight information - required
  airportName: z.string().min(1, "نام فرودگاه اجباری است"),
  flightNumber: z.string().min(1, "شماره پرواز اجباری است"),
  travelDateGregorian: z.string().min(1, "تاریخ سفر اجباری است"),
  
  // Buyer information - required
  buyer_phone: z.string()
    .min(11, "شماره تلفن باید حداقل ۱۱ رقم باشد")
    .max(11, "شماره تلفن باید حداکثر ۱۱ رقم باشد")
    .regex(/^09\d{9}$/, "شماره تلفن باید با 09 شروع شود"),
  buyer_email: z.string()
    .email("ایمیل معتبر نیست")
    .optional()
    .or(z.literal("")),
  
  // Passengers - at least one required
  passengers: z.array(passengerSchema)
    .min(1, "حداقل یک مسافر اجباری است"),
  
  // Optional fields
  terminal_id: z.number().optional(),
  cip_class_type: z.enum(["class_a", "class_b"]).optional(),
  final_destination: z.string().optional(),
  travel_time: z.string().optional(),
  pets: z.record(z.string(), z.number()).optional(),
  attendances: z.record(z.string(), z.number()).optional(),
  order_comment: z.string().optional(),
  gateway: z.number().optional(),
  payment_method: z.enum(["zarinpal", "saman", "wallet"]).optional(),
});

// Type for validated form data
export type ValidatedTravelForm = z.infer<typeof travelFormSchema>;
export type ValidatedPassenger = z.infer<typeof passengerSchema>;

// Validation error messages in Persian
export const validationMessages = {
  required: "این فیلد اجباری است",
  minLength: (min: number) => `حداقل ${min} کاراکتر لازم است`,
  maxLength: (max: number) => `حداکثر ${max} کاراکتر مجاز است`,
  email: "ایمیل معتبر نیست",
  phone: "شماره تلفن معتبر نیست",
  nationalId: "کد ملی معتبر نیست",
  minPassengers: "حداقل یک مسافر اجباری است",
};
