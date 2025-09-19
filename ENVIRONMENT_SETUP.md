# راهنمای تنظیم Environment Variables

## فایل .env.local

برای اجرای صحیح برنامه، فایل `.env.local` را در root directory ایجاد کنید و متغیرهای زیر را اضافه کنید:

```bash
# CIP API Configuration
CIP_TOKEN=your_cip_api_token_here
CIP_BASE_URL=https://cipikia.co
CIP_FLIGHT_SEARCH_BASE_URL=http://78.157.58.69

# Next.js API URL (if different from default)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## توضیح متغیرها:

### CIP_TOKEN
- **توضیح**: توکن احراز هویت برای API های CIP
- **مثال**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### CIP_BASE_URL
- **توضیح**: آدرس پایه برای API های CIP
- **پیش‌فرض**: `https://cipikia.co`
- **استفاده**: برای API های رزرو و وضعیت پرداخت

### CIP_FLIGHT_SEARCH_BASE_URL
- **توضیح**: آدرس پایه برای API جستجوی پرواز
- **پیش‌فرض**: `http://78.157.58.69`
- **استفاده**: برای جستجوی پرواز با فرمت `http://78.157.58.69/api/flight/{flight_number}?flight_date={date}&expand=0&flight_type=arrivals&airport=ika&cip_class=class_a`

### NEXT_PUBLIC_API_URL
- **توضیح**: آدرس API داخلی Next.js
- **پیش‌فرض**: `http://localhost:3000`
- **استفاده**: برای API های داخلی برنامه

## نحوه استفاده:

1. فایل `.env.local` را در root directory ایجاد کنید
2. متغیرهای بالا را با مقادیر واقعی پر کنید
3. سرور را restart کنید
4. برنامه آماده استفاده است

## نکات مهم:

- **هرگز** فایل `.env.local` را commit نکنید
- متغیرهای `NEXT_PUBLIC_*` در client-side قابل دسترسی هستند
- متغیرهای بدون `NEXT_PUBLIC_` فقط در server-side قابل دسترسی هستند
- برای production، این متغیرها را در hosting platform تنظیم کنید
