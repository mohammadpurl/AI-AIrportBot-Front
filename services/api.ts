import { CipClass, CIPReservationData, CIPReservationResponse, CreateOrderRequest, CreateOrderResponse, CreatePassengerRequest, CreatePassengerResponse, FlightItem, FlightSearchRequest, FlightSearchResponse, FlightsListParams, FlightsListResponse, FlightType, Message, TicketInfo } from "@/types/type";
import { Language } from "@/hooks/useChat";
import { notifyError } from "@/lib/notifier";

export async function introduction (language: Language = "fa") {
  try{
    if (!process.env.NEXT_PUBLIC_API_URL) {
      notifyError("متغیر NEXT_PUBLIC_API_URL تنظیم نشده است", "پیکربندی نامعتبر");
      throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
    }
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/aiassistant/intro?language=${language}`,
      {
        method: "GET",
        
      },
    );

    if (!response.ok) {
      notifyError("دریافت پاسخ از سرور ناموفق بود", "خطای سرور");
      throw new Error("Failed to get response from backend");
    }
    const data = await response.json();
    return data;
    
  }
  catch(error){
    console.error("Error asking question:", error);
    notifyError(error instanceof Error ? error.message : "خطایی رخ داد", "خطا");
    throw error;
  }

}

export async function sendUserMessage(message: string, session_id: string, language: Language = "fa") {
  try {
    
    console.log(
      "process.env.NEXT_PUBLIC_API_URL",
      process.env.NEXT_PUBLIC_API_URL,
    );
    
    if (!process.env.NEXT_PUBLIC_API_URL) {
      notifyError("متغیر NEXT_PUBLIC_API_URL تنظیم نشده است", "پیکربندی نامعتبر");
      throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
    }
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/aiassistant/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({message, session_id, language}), // اضافه کردن language
      },
    );

    if (!response.ok) {
      notifyError("دریافت پاسخ از سرور ناموفق بود", "خطای سرور");
      throw new Error("Failed to get response from backend");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error asking question:", error);
    notifyError(error instanceof Error ? error.message : "خطایی رخ داد", "خطا");
    throw error;
  }
}

export async function saveConversation(
  messages: Message[],
) {
  try {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
    } 
    
    // Convert Message[] to BatchMessage[] format required by API
    const batchMessages = messages
      .filter(msg => msg.id && msg.text && msg.sender) // Only include messages with required fields
      .map(({ id, text, sender }) => ({
        sender: sender as string, // Convert MessageSender enum to string
        id: id as string,
        text: text
      }));
    
    console.log("Sending batch messages:", batchMessages);
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchMessages), // Array of BatchMessage objects
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save conversation");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw error;
  }
}

export async function extractPassengerDataWithOpenAI(messages: Message[]) {
  
  try {
    console.log(`process.env.NEXT_PUBLIC_API_URL ${process.env.NEXT_PUBLIC_API_URL}`)
  
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
    }
    
    // Convert Message[] to BatchMessage[] format for consistency
    const batchMessages = messages
      .filter(msg => msg.id && msg.text && msg.sender) // Only include messages with required fields
      .map(({ id, text, sender }) => ({
        sender: sender as string, // Convert MessageSender enum to string
        id: id as string,
        text: text
      }));
    
    console.log("Sending messages for extraction:", batchMessages);
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/extract-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({messages: batchMessages}),
    });
    if (!res.ok) throw new Error("Failed to extract info");

    return await res.json();
  } catch (error) {
    console.error("Failed to extract info:", error);
    throw new Error("Failed to extract info");
  }
}



export async function saveTrip(tripData: TicketInfo) {
  console.log(`process.env.NEXT_PUBLIC_API_URL ${process.env.NEXT_PUBLIC_API_URL}`)
  
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
  }
  
  // Ensure passengerCount is always a string
  const normalizedTripData: TicketInfo = {
    ...tripData,
    passengerCount: tripData.passengerCount ? String(tripData.passengerCount) : undefined,
    passengers: (tripData.passengers || []).map((p) => ({
      ...p
    
    })),
  };
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizedTripData),
  });

  if (!res.ok) throw new Error("Failed to save trip");

  return await res.json(); // فرض: خروجی شامل id یا tripId است
}

export async function fetchTrip(tripId: string) {

  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/trips/${tripId}`, {
    cache: "no-store",
  });
  console.log(`get trip data ${JSON.stringify(res)}`)
  if (!res.ok) throw new Error("Failed to fetch trip data");
  return await res.json();
}

// Search for flight to get flight_id
export async function searchFlight(searchRequest: FlightSearchRequest): Promise<FlightSearchResponse> {
  try {
    console.log("Searching for flight:", searchRequest);
    
    const accessToken = process.env.CIP_TOKEN;
    const flightSearchBaseUrl =
      process.env.NEXT_PUBLIC_CIP_FLIGHT_SEARCH_BASE_URL ||
      process.env.CIP_FLIGHT_SEARCH_BASE_URL ||
      'http://78.157.58.69';
    
    if (!accessToken) {
      console.warn('CIP_TOKEN not found in environment variables');
    }
    
    // Extract flight number from the request (e.g., "IR123" -> "123")
    const flightNumber = searchRequest.flight_number.replace(/[^0-9]/g, '');
    
    // Build the API URL according to the documentation
    const flightSearchUrl = `${flightSearchBaseUrl}/api/flight/${flightNumber}?flight_date=${searchRequest.flight_date}&expand=0&flight_type=arrivals&airport=ika&cip_class=class_a`;
    
    console.log("Flight search URL:", flightSearchUrl);
    
    const response = await fetch(flightSearchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      console.warn(`Flight search API returned ${response.status}: ${response.statusText}`);
      // Return mock data for testing if API is not available
      return {
        success: true,
        flight_id: "464425", // Mock flight ID
        flight_info: {
          flight_number: searchRequest.flight_number,
          departure: "IKA",
          arrival: "IST",
          departure_time: "10:30",
          arrival_time: "14:45"
        }
      };
    }
    
    const result = await response.json();
    console.log("Flight search result:", result);
    
    // Parse the response according to the API documentation
    if (result && result.data && result.data.length > 0) {
      const flightData = result.data[0]; // Get first flight
      return {
        success: true,
        flight_id: flightData.id?.toString() || flightData.flight_id?.toString() || "unknown",
        flight_info: {
          flight_number: flightData.flight_number || searchRequest.flight_number,
          departure: flightData.departure_airport || "IKA",
          arrival: flightData.arrival_airport || "Unknown",
          departure_time: flightData.departure_time || "Unknown",
          arrival_time: flightData.arrival_time || "Unknown"
        }
      };
    } else {
      return {
        success: false,
        error: "No flights found for the given criteria"
      };
    }
    
  } catch (error) {
    console.warn('Flight search API error, using mock data:', error);
    // Return mock data for testing
    return {
      success: true,
      flight_id: "464425", // Mock flight ID
      flight_info: {
        flight_number: searchRequest.flight_number,
        departure: "IKA",
        arrival: "IST", 
        departure_time: "10:30",
        arrival_time: "14:45"
      }
    };
  }
}

// Env-driven flight type and cip class


export function resolveFlightTypeFromEnv(defaultType: FlightType = "arrivals"): FlightType {
  const envType = (process.env.NEXT_PUBLIC_FLIGHT_TYPE || process.env.FLIGHT_TYPE || "").toLowerCase();
  if (envType === "departures" || envType === "arrivals") return envType;
  return defaultType;
}

export function mapUserSelectionToFlightType(userSelectionFa?: string, fallback?: FlightType): FlightType {
  // "خروجی" => departures, "ورودی" => arrivals
  if (userSelectionFa) {
    const normalized = userSelectionFa.trim();
    if (normalized === "خروجی") return "departures";
    if (normalized === "ورودی") return "arrivals";
  }
  return fallback || resolveFlightTypeFromEnv("arrivals");
}



// Simple de-dup + micro-cache to avoid flooding the endpoint with identical requests
const __getInFlight: Record<string, Promise<Response>> = {};
const __getCache = new Map<string, { ts: number; payload: unknown }>();
const __GET_TTL_MS = 30_000; // 30s

async function dedupedJsonGet(url: string): Promise<{ ok: boolean; status: number; json: unknown; text?: string }> {
  // Serve fresh cache if valid
  const cached = __getCache.get(url);
  const now = Date.now();
  if (cached && now - cached.ts < __GET_TTL_MS) {
    return { ok: true, status: 200, json: cached.payload };
  }

  // De-duplicate in-flight
  if (!__getInFlight[url]) {
    __getInFlight[url] = fetch(url, { method: 'GET', cache: 'no-store' })
      .finally(() => { delete __getInFlight[url]; });
  }
  const res = await __getInFlight[url];
  const status = res.status;
  const ok = res.ok;
  let json: unknown = null;
  let text: string | undefined;
  try {
    json = await res.json();
  } catch {
    text = await res.text();
    // Try to parse text as JSON if possible (our proxy may return text)
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        // leave json as null; cache raw text below
      }
    }
  }
  if (ok) {
    __getCache.set(url, { ts: Date.now(), payload: json != null ? json : text });
  }
  return { ok, status, json, text };
}

export async function fetchFlightsList(params: FlightsListParams): Promise<FlightsListResponse> {
  try {
    // Call internal proxy to bypass CORS from browser
    const flight_type = params.flight_type || resolveFlightTypeFromEnv('arrivals');
    const cip_class = params.cip_class || 'class_a';
    const expand = params.expand ?? 1;

    const url = `/api/flights?flight_date=${encodeURIComponent(params.flight_date)}&expand=${encodeURIComponent(String(expand))}&flight_type=${encodeURIComponent(flight_type)}&cip_class=${encodeURIComponent(cip_class)}`;

    const res = await dedupedJsonGet(url);
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${res.text || 'Request failed'}` };
    }
    // Our proxy might return JSON object, array, or raw text; normalize it
    let result: unknown = res.json;
    if (!result && res.text) {
      try {
        result = JSON.parse(res.text) as unknown;
      } catch {
        // If it's pure text and not JSON, fallback to empty list
        result = [];
      }
    }
    // Normalize to { success, data }
    const dataSource = (result as { data?: unknown })?.data ?? result;
    const data: FlightItem[] = Array.isArray(dataSource) ? (dataSource as FlightItem[]) : [];
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function findFlightByNumber(
  flightNumber: string,
  flight_date: string,
  options?: { userSelectionFa?: string; cip_class?: CipClass; expand?: string | number; flight_type_override?: FlightType }
): Promise<FlightSearchResponse> {
  // Decide flight_type
  const flight_type = options?.flight_type_override || mapUserSelectionToFlightType(options?.userSelectionFa);
  console.log('flight_type', flight_type);
  const listRes = await fetchFlightsList({
    flight_date,
    expand: options?.expand ?? 1,
    flight_type,
    cip_class: options?.cip_class || 'class_a',
  });

  if (!listRes.success || !listRes.data) {
    return { success: false, error: listRes.error || 'Failed to fetch flights' };
  }

  // Match logic: compare numeric part and also full string, case-insensitive
  const targetNum = flightNumber.replace(/\s+/g, '').toLowerCase();
  const targetDigits = flightNumber.replace(/[^0-9]/g, '');

  const match = listRes.data.find((f: FlightItem) => {
    const rawNum = f.fl_number || (f as unknown as { flight_number?: string }).flight_number || '';
    const fNum = String(rawNum).replace(/\s+/g, '').toLowerCase();
    const fDigits = String(rawNum).replace(/[^0-9]/g, '');
    return fNum === targetNum || (targetDigits && fDigits === targetDigits);
  });

  if (!match) {
    return { success: false, error: 'Flight not found in list' };
  }

  return {
    success: true,
    flight_id: (match.fl_id ?? (match as unknown as { id?: string | number }).id ?? (match as unknown as { flight_id?: string | number }).flight_id)?.toString(),
    flight_info: {
      flight_number: match.fl_number || flightNumber,
      departure: match.airport_from?.ap_iata || match.airport_from?.ap_title_en || match.airport_from?.ap_title_fa || 'IKA',
      arrival: match.airport_to?.ap_iata || match.airport_to?.ap_title_en || match.airport_to?.ap_title_fa || 'Unknown',
      departure_time: match.time || match.fl_sch_date || 'Unknown',
      arrival_time: (match as unknown as { arrival_time?: string; sta?: string }).arrival_time || (match as unknown as { sta?: string }).sta || 'Unknown',
      airline_title_fa: match.airline?.al_title_fa,
      terminal_title_fa: match.terminal?.te_title,
      origin_title_fa: match.airport_from?.ap_title_fa,
      destination_title_fa: match.airport_to?.ap_title_fa,
      scheduled_datetime: match.fl_sch_date,
      time: match.time,
    },
    destination_title_fa: match.airport_to?.ap_title_fa,
    matched_item: match,
  };
}




export async function createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse> {
  try {
    // API expects x-www-form-urlencoded; always go through internal proxy to avoid 419
    const body = new URLSearchParams();
    if (order.flight_id) body.append('flight_id', order.flight_id);
    if (order.flight_date) body.append('flight_date', order.flight_date);
    if (order.flight_number) body.append('flight_number', order.flight_number);
    if (order.order_email) body.append('order_email', order.order_email);
    if (order.order_mobile) body.append('order_mobile', order.order_mobile);
    if (order.order_comment) body.append('order_comment', order.order_comment);
    body.append('order_type', order.order_type || 'core');
    body.append('cip_class', order.cip_class || 'class_a');

    const res = await fetch(`/api/order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });

    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${txt}` };
    }
    console.log('createOrder res', res);
    const text = await res.text();
    let resultUnknown: unknown;
    try {
      resultUnknown = JSON.parse(text);
    } catch {
      resultUnknown = { status: true, message: text } as const;
    }
    const resultObj = (resultUnknown && typeof resultUnknown === 'object') ? (resultUnknown as Record<string, unknown>) : {};
    const dataObj = (resultObj.data && typeof resultObj.data === 'object') ? (resultObj.data as Record<string, unknown>) : undefined;
    const orderId = (dataObj?.order_id ?? resultObj.order_id ?? resultObj.id) as string | number | undefined;
    const successFlag = (resultObj.status as boolean | undefined) ?? (resultObj.success as boolean | undefined) ?? true;
    return {
      success: Boolean(successFlag),
      data: orderId !== undefined ? { order_id: String(orderId) } : undefined,
      message: resultObj.message as string | undefined,
      error: resultObj.error as string | undefined,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Passenger create for an existing order


export async function createPassenger(passenger: CreatePassengerRequest): Promise<CreatePassengerResponse> {
  try {
    const body = new URLSearchParams();
    body.append('order_id', passenger.order_id);
    body.append('first_name', passenger.first_name);
    body.append('last_name', passenger.last_name);
    {
      const generatedAlt = `${passenger.first_name || ''} ${passenger.last_name || ''}`.trim();
      const alt = (passenger.alt_name && passenger.alt_name.trim().length > 0) ? passenger.alt_name : generatedAlt;
      if (alt) body.append('alt_name', alt);
    }
    body.append('mobile_number', passenger.mobile_number);
    body.append('final_destination', passenger.final_destination);
    body.append('passport_number', passenger.passport_number);
    body.append('bag_count', String(passenger.bag_count));
    body.append('passen_type', passenger.passen_type);
    body.append('gender', passenger.gender);
    // Map to backend accepted values: iranian | not_iranian
    const mappedNationality = passenger.passen_nationality === 'iranian' ? 'iranian' : 'not_iranian';
    body.append('passen_nationality', mappedNationality);
    if (passenger.melicode) body.append('melicode', passenger.melicode);

    const res = await fetch(`/api/order/passenger/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });

    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${txt}` };
    }

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text) as Record<string, unknown>; } catch { json = {}; }
    const status = (json.status as boolean | undefined) ?? (json.success as boolean | undefined) ?? res.ok;
    const message = (json.message as string | undefined) || (json.error as string | undefined);
    const dataObj = (json.data && typeof json.data === 'object') ? (json.data as Record<string, unknown>) : undefined;
    const id = (dataObj?.passenger_id ?? json.id) as string | number | undefined;
    return {
      success: Boolean(status),
      message,
      id,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

type OrderPricesData = {
  order_id: number;
  passenger_amount: number;
  passenger_service_amount: number;
  service_amount: number;
  pet_amount: number;
  total_discount: number;
  total_tax: number;
  total_order_amount: number;
};

export async function getOrderPrices(order_id: string): Promise<{ success: boolean; data?: OrderPricesData; error?: string }>{
  try {
    const body = new URLSearchParams();
    body.append('order_id', order_id);
    const res = await fetch('/api/order/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text) as Record<string, unknown>; } catch { return { success: false, error: text }; }
    const status = (json.status as boolean | undefined) ?? (json.success as boolean | undefined) ?? res.ok;
    const data = (json.data && typeof json.data === 'object') ? (json.data as Record<string, unknown>) : undefined;
    const normalized: OrderPricesData | undefined = data
      ? {
          order_id: Number(data.order_id as number | string),
          passenger_amount: Number(data.passenger_amount as number | string),
          passenger_service_amount: Number(data.passenger_service_amount as number | string),
          service_amount: Number(data.service_amount as number | string),
          pet_amount: Number(data.pet_amount as number | string),
          total_discount: Number(data.total_discount as number | string),
          total_tax: Number(data.total_tax as number | string),
          total_order_amount: Number(data.total_order_amount as number | string),
        }
      : undefined;
    return { success: Boolean(status), data: normalized };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getPaymentLink(order_id: string): Promise<{ success: boolean; payment_link?: string; error?: string }>{
  try {
    const body = new URLSearchParams();
    body.append('order_id', order_id);
    const res = await fetch('/api/order/payment/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text) as Record<string, unknown>; } catch { return { success: false, error: text }; }
    const status = (json.status as boolean | undefined) ?? (json.success as boolean | undefined) ?? res.ok;
    const dataObj = (json.data && typeof json.data === 'object') ? (json.data as Record<string, unknown>) : undefined;
    return { success: Boolean(status), payment_link: dataObj?.payment_link as string | undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}



// Get CSRF token from CIP website
export async function getCSRFToken(): Promise<string | null> {
  try {
    const accessToken = process.env.CIP_TOKEN;
    const cipBaseUrl = process.env.CIP_BASE_URL || 'https://cipikia.co';
    
    const response = await fetch(`${cipBaseUrl}/cip/reserve/create`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      console.warn('Failed to get CSRF token, using fallback');
      return null;
    }
    
    const html = await response.text();
    const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/);
    
    if (tokenMatch && tokenMatch[1]) {
      return tokenMatch[1];
    }
    
    console.warn('CSRF token not found in HTML, using fallback');
    return null;
  } catch (error) {
    console.warn('Error getting CSRF token:', error);
    return null;
  }
}

// Create CIP reservation and get payment URL
export async function createCIPReservation(reservationData: CIPReservationData): Promise<CIPReservationResponse> {
  try {
    console.log("Creating CIP reservation with data:", reservationData);
    
    const accessToken = process.env.CIP_TOKEN;
    if (!accessToken) {
      console.warn('CIP_TOKEN not found in environment variables');
    }
    
    // Get CSRF token dynamically
    const csrfToken = await getCSRFToken();
    const token = csrfToken || 'iKQcutl14dLYqcXa7qYGVPsPGPgU5Lnze6ne5f9R'; // Fallback token
    
    console.log("Using CSRF token:", token);
    
    // Prepare form data for CIP API
    const formData = new FormData();
    
    // Add CSRF token
    formData.append('_token', token);
    
    // Basic flight information
    formData.append('terminal_id', reservationData.terminal_id.toString());
    formData.append('flight_id', reservationData.flight_id);
    formData.append('cip_class_type', reservationData.cip_class_type);
    formData.append('passenger_count', reservationData.passenger_count.toString());
    
    if (reservationData.fly_date) {
      formData.append('fly_date', reservationData.fly_date);
    }
    
    // Passenger information
    reservationData.passengers.forEach((passenger) => {
      formData.append(`melicode[]`, passenger.melicode);
      formData.append(`name[]`, passenger.name);
      formData.append(`family[]`, passenger.family);
      formData.append(`mobile_number[]`, passenger.mobile_number);
      formData.append(`passport_number[]`, passenger.passport_number);
      formData.append(`bag_count[]`, String(passenger.bag_count));
      formData.append(`final_destination[]`, passenger.final_destination);
      formData.append(`nationality[]`, passenger.nationality);
      formData.append(`passenger_type[]`, passenger.passenger_type);
      formData.append(`gender[]`, passenger.gender);
      
      if (passenger.description) {
        formData.append(`description[]`, passenger.description);
      }
      
      if (passenger.attach_file) {
        formData.append(`attach_file[]`, passenger.attach_file);
      }
    });
    
    // Additional fields
    Object.entries(reservationData.pets).forEach(([key, value]) => {
      formData.append(`pets[${key}]`, value.toString());
    });
    
    Object.entries(reservationData.attendances).forEach(([key, value]) => {
      formData.append(`attendances[${key}]`, value.toString());
    });
    
    formData.append('buyer_phone', reservationData.buyer_phone);
    formData.append('buyer_email', reservationData.buyer_email);
    formData.append('order_comment', reservationData.order_comment);
    formData.append('gateway', reservationData.gateway.toString());
    formData.append('payment_method', reservationData.payment_method);
    
    // Call CIP API
    const cipBaseUrl = process.env.CIP_BASE_URL || 'https://cipikia.co';
    const response = await fetch(`${cipBaseUrl}/cip/reserve/create`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${accessToken}`,
        'Referer': `${cipBaseUrl}/cip/reserve/${reservationData.flight_id}/frodgah-bynalmlly-amam-khmynyimam-khomeini-international-airporttofrodgah-byn-almlly-astanbolairport-turkey-istanbul?class_type=${reservationData.cip_class_type}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Check if the response contains a redirect URL or payment URL
    if (result.redirect_url || result.payment_url) {
      return {
        success: true,
        reservation_id: result.reservation_id,
        payment_url: result.payment_url || result.redirect_url,
        redirect_url: result.redirect_url,
        message: result.message || "Reservation created successfully"
      };
    }
    
    // If no redirect URL, assume success and return the result
    return {
      success: true,
      reservation_id: result.id || result.reservation_id,
      message: result.message || "Reservation created successfully"
    };
    
  } catch (error) {
    console.error('Error creating CIP reservation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Test CIP API connectivity
export async function testCIPAPI(): Promise<{
  success: boolean;
  message: string;
  csrfToken?: string;
}> {
  try {
    const csrfToken = await getCSRFToken();
    
    if (csrfToken) {
      return {
        success: true,
        message: "CIP API is accessible and CSRF token obtained",
        csrfToken: csrfToken.substring(0, 20) + "..." // Show only first 20 chars for security
      };
    } else {
      return {
        success: false,
        message: "CIP API is accessible but CSRF token not found"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `CIP API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Get payment status
export async function getPaymentStatus(reservationId: string): Promise<{
  success: boolean;
  status?: "pending" | "completed" | "failed";
  payment_url?: string;
  error?: string;
}> {
  try {
    const accessToken = process.env.CIP_TOKEN;
    const cipBaseUrl = process.env.CIP_BASE_URL || 'https://cipikia.co';
    
    const response = await fetch(`${cipBaseUrl}/cip/reserve/status/${reservationId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      status: result.status,
      payment_url: result.payment_url
    };
    
  } catch (error) {
    console.error('Error getting payment status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}