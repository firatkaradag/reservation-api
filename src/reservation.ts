export interface Stay {
    arrivalDate?: Date;
    departureDate?: Date;
}

export enum RoomSize {
    BUSINESS = "business-suite",
    PRESIDENTAL = "presidential-suite",
    STANDARD = "standard-suite"
}

export interface Room {
    roomSize: RoomSize;
    roomQuantity: number;
}

export interface Street {
    streetName: string;
    streetNumber: number;
}

export interface Location {
    zipCode: string;
    state: string;
    city: string;
}

export enum Extra {
    BREAKFAST = "extraBreakfast",
    TV = "extraTV",
    WIFI = "extraWiFi",
    PARKING = "extraParking",
    BALCONY = "extraBalcony"
}

export enum PaymentType {
    NONE = "none",
    CREDIT_CARD = "cc",
    PAYPAL = "paypal",
    CASH = "cash",
    BITCOIN = "bitcoin",
}

export interface Reservation {
    id?: string;
    stay: Stay;
    room: Room;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressStreet: Street;
    addressLocation: Location;
    extras: Extra[];
    payment: PaymentType;
    note: string;
    tags: string[];
    reminder: boolean;
    newsletter: boolean;
    confirm: boolean;
}

export interface ReservationShort {
    id?: string;
    stay: Stay;
    firstName: string;
    lastName: string;
    addressStreet: Street;
    addressLocation: Location;
    extras: Extra[];
}