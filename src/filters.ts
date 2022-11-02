import { Extra, Reservation, Stay } from "./reservation";

export enum FilterType {
    Extras, Stay
}

export interface Filter {
    type: FilterType;
    data: any
}

export interface ReservationFilter {
    type: FilterType;
    data: any;
    apply: (reservation: Reservation) => boolean;
}

export class ExtrasFilter implements ReservationFilter {
    type: FilterType = FilterType.Extras;
    data: Extra[] = [];
    constructor(extras: Extra[]) {
        this.data = extras;
    }
    apply(reservation: Reservation): boolean {
        return this.data.every((extra: Extra) => reservation.extras.includes(extra))
    };
}

export class StayFilter implements ReservationFilter {
    type: FilterType = FilterType.Stay;
    data: Stay;
    constructor(stay: Stay) {
        this.data = stay;
    }
    apply(reservation: Reservation): boolean {
           if (this.data.arrivalDate && this.data.departureDate && 
            reservation.stay.arrivalDate && reservation.stay.departureDate) {
                return ((this.data.arrivalDate <= reservation.stay.arrivalDate && this.data.departureDate >= reservation.stay.arrivalDate)
                    || (this.data.arrivalDate <= reservation.stay.departureDate && this.data.departureDate >= reservation.stay.departureDate))
            }
                
            return true;
    };
}