export declare enum VoiceEmotion {
    EXCITED = "excited",
    SERIOUS = "serious",
    FRIENDLY = "friendly",
    SOOTHING = "soothing",
    BROADCASTER = "broadcaster"
}
export declare enum ElevenLabsModel {
    eleven_flash_v2_5 = "eleven_flash_v2_5",
    eleven_multilingual_v2 = "eleven_multilingual_v2"
}
export interface ElevenLabsSettings {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
}
export declare enum STTProvider {
    DEEPGRAM = "deepgram",
    GLADIA = "gladia"
}
export interface STTSettings {
    provider?: STTProvider;
    confidence?: number;
}

export interface StartAvatarResponse {
    session_id: string;
    access_token: string;
    url: string;
    is_paid: boolean;
    session_duration_limit: number;
}
export declare enum TaskType {
    TALK = "talk",
    REPEAT = "repeat"
}
export declare enum TaskMode {
    SYNC = "sync",
    ASYNC = "async"
}
export interface SpeakRequest {
    text: string;
    task_type?: TaskType;
    taskType?: TaskType;
    taskMode?: TaskMode;
}
export interface CommonRequest {
    [key: string]: unknown;
}
export declare enum StreamingEvents {
    AVATAR_START_TALKING = "avatar_start_talking",
    AVATAR_STOP_TALKING = "avatar_stop_talking",
    AVATAR_TALKING_MESSAGE = "avatar_talking_message",
    AVATAR_END_MESSAGE = "avatar_end_message",
    USER_TALKING_MESSAGE = "user_talking_message",
    USER_END_MESSAGE = "user_end_message",
    USER_START = "user_start",
    USER_STOP = "user_stop",
    USER_SILENCE = "user_silence",
    STREAM_READY = "stream_ready",
    STREAM_DISCONNECTED = "stream_disconnected",
    CONNECTION_QUALITY_CHANGED = "connection_quality_changed"
}
export type EventHandler = (...args: unknown[]) => void;
export interface EventData {
    [key: string]: unknown;
    task_id: string;
}
export interface StreamingStartTalkingEvent extends EventData {
    type: StreamingEvents.AVATAR_START_TALKING;
}
export interface StreamingStopTalkingEvent extends EventData {
    type: StreamingEvents.AVATAR_STOP_TALKING;
}
export interface StreamingTalkingMessageEvent extends EventData {
    type: StreamingEvents.AVATAR_TALKING_MESSAGE;
    message: string;
}
export interface StreamingTalkingEndEvent extends EventData {
    type: StreamingEvents.AVATAR_END_MESSAGE;
}
export interface UserTalkingMessageEvent extends EventData {
    type: StreamingEvents.USER_TALKING_MESSAGE;
    message: string;
}
export interface UserTalkingEndEvent extends EventData {
    type: StreamingEvents.USER_END_MESSAGE;
}
export enum MessageSender {
    CLIENT = "CLIENT",
    AVATAR = "AVATAR",
  }
  
  
  
export interface Passenger {
    name: string;
    lastName?: string;
    nationalId: string;
    passportNumber: string;
    luggageCount?: string | number;
    passengerType: "adult" | "infant";
    gender: string; // e.g., "male" | "female" or localized values like "خانم"
    nationality: "iranian" | "non_iranian" | "diplomat"; // ایرانی، غیر ایرانی، دیپلمات
}

export interface TicketInfo {
    airportName?: string;
    travelType?: string; // e.g., "departure" | "arrival"
    travelDate?: string;
    passengerCount?: string; // Always string, will be converted from any input type
    additionalInfo?: string;
    // Keep for backward compatibility where needed
    flightType?: "class_a" | "class_b";
    flightNumber?: string;
    flightId?: string; // CIP API flight ID
    buyer_phone?: string; // شماره تماس خریدار
    buyer_email?: string; // ایمیل خریدار
    passengers: Passenger[];
}
  export interface MouthCue {
    start: number;
    end: number;
    value: string; // e.g., "A", "B", ..., "X"
  }
  
  export interface LipsyncMetadata {
    soundFile: string;
    duration: number;
  }
  
  export interface Lipsync {
    metadata: LipsyncMetadata;
    mouthCues: MouthCue[];
  }
  
export interface Message {
  id?: string;
  text: string;
  audio?: string;
  lipsync?: Lipsync;
  facialExpression?: string; // e.g., "smile"
  animation?: string;        // e.g., "Laughing"
  sender?: MessageSender;
}

// Interface for API batch messages (required format)
export interface BatchMessage {
  sender: string; // "CLIENT" or "AVATAR"
  id: string;
  text: string;
}

//   export interface Conversation{
//     id?: string;
//     text: string;   
//     sender?: MessageSender;
//   }
  
export interface FlightSearchRequest {
    flight_number: string;
    flight_date: string; // YYYY-MM-DD format
  }
  
  // Interface for flight search response
  export interface FlightSearchResponse {
    success: boolean;
    flight_id?: string;
    flight_info?: {
      flight_number: string;
      departure: string;
      arrival: string;
      departure_time: string;
      arrival_time: string;
      airline_title_fa?: string;
      terminal_title_fa?: string;
      origin_title_fa?: string;
      destination_title_fa?: string;
      scheduled_datetime?: string; // e.g., fl_sch_date
      time?: string; // e.g., "23:50"
    };
    error?: string;
    destination_title_fa?: string;
    matched_item?: FlightItem;
  }



// Minimal shape of a flight record we expect from the flights list API
export interface FlightItem {
    // Primary identifiers and basic info
    fl_id?: number;
    te_id?: number;
    al_id?: number;
    ap_id_from?: number;
    ap_id_destination?: number;
    fl_number?: string; // e.g., I36633
    fl_capacity?: number;
    fl_type?: FlightType; // departures | arrivals
    fl_sch_date?: string; // "2025-09-26 23:50:00"
    fl_sch_time?: number; // epoch seconds
    created_at?: string;
    hasCapacity?: boolean;
    can_reserve?: boolean;
    time?: string; // "23:50"
  
    // Nested structures
    airline?: {
      al_id?: number;
      al_title_en?: string;
      al_title_fa?: string;
      al_iata?: string;
      al_icao?: string;
      logo?: string;
    };
    terminal?: {
      te_id?: number;
      te_title?: string;
    };
    airport_from?: {
      ap_id?: number;
      ap_title_en?: string;
      ap_title_fa?: string;
      ap_iata?: string;
      ap_icao?: string;
    };
    airport_to?: {
      ap_id?: number;
      ap_title_en?: string;
      ap_title_fa?: string;
      ap_iata?: string;
      ap_icao?: string;
    };
  }
  export type FlightType = "departures" | "arrivals";

  export type CipClass = "class_a" | "class_b";
  export interface FlightsListParams {
    flight_date: string; // YYYY-MM-DD
    expand?: string | number; // 0/1
    flight_type?: FlightType; // override env
    cip_class?: CipClass; // default class_a
  }
  
  export interface FlightsListResponse {
    success: boolean;
    data?: FlightItem[];
    error?: string;
  }

  export interface CIPReservationData {
    terminal_id: number;
    flight_id: string;
    cip_class_type: "class_a" | "class_b" | "class_c";
    passenger_count: number;
    fly_date?: string;
    passengers: {
      melicode: string;
      name: string;
      family: string;
      mobile_number: string;
      passport_number: string;
      bag_count: number;
      final_destination: string;
      nationality: "iranian" | "non_iranian" | "diplomat";
      passenger_type: "adult" | "infant";
      gender: "male" | "female";
      description?: string;
      attach_file?: File;
    }[];
    pets: { [key: string]: number };
    attendances: { [key: string]: number };
    buyer_phone: string;
    buyer_email: string;
    order_comment: string;
    gateway: number;
    payment_method: "zarinpal" | "saman" | "wallet";
  }
  
  // Interface for CIP API response
  export interface CIPReservationResponse {
    success: boolean;
    reservation_id?: string;
    payment_url?: string;
    redirect_url?: string;
    message?: string;
    error?: string;
  }
  
  // Order create (without requiring flight_id)
  export interface CreateOrderRequest {
    flight_id?: string; // optional
    flight_date?: string; // YYYY-MM-DD
    flight_number?: string; // e.g., W5077 or IR123
    order_email?: string;
    order_mobile?: string;
    order_comment?: string;
    order_type?: string; // core (default)
    cip_class?: "class_a" | "class_b" | "class_c";
  }
  
  export interface CreateOrderResponse {
    success: boolean;    
    message?: string;
    error?: string;
    data?: {
      order_id?: string;      
    };
  
  }

  export interface CreatePassengerRequest {
    order_id: string;
    first_name: string;
    last_name: string;
    alt_name?: string; // فارسی
    mobile_number: string;
    final_destination: string; // e.g., IST
    passport_number: string;
    bag_count: number | string;
    passen_type: "adult" | "infant"; // matches API field name
    gender: "male" | "female";
    // Backend expects: iranian | not_iranian
    passen_nationality: "iranian" | "not_iranian";
    melicode?: string;
  }
  
  export interface CreatePassengerResponse {
    success: boolean;
    message?: string;
    error?: string;
    id?: string | number;
  }