import {describe, expect, test} from '@jest/globals';
import { StayFilter, ExtrasFilter } from './filters';
import { RoomSize, Extra, PaymentType } from './reservation';

export const fakeReservation = {
  stay: { arrivalDate: new Date('11/4/2022'), departureDate: new Date('11/8/2022')},
  room: { roomQuantity: 1, roomSize: RoomSize.STANDARD },
  firstName: 'Fake',
  lastName: 'Test',
  email: 'fake@test.com',
  phone: '+12345678900',
  addressStreet: { streetName: 'fake street', streetNumber: 0 },
  addressLocation: { zipCode: 'L1L1L1', state: 'Ontario', city: 'Burlington'},
  extras: [Extra.BALCONY],
  payment: PaymentType.BITCOIN,
  note: 'this is fake note',
  tags: ['fake', 'test'],
  reminder: false,
  newsletter: true,
  confirm: false
}

describe('Filters', () => {
  
  test('stay filter with given date within stay dates', () => {
    let reservations = [
      {...fakeReservation, id: '00000001', stay: { arrivalDate: new Date('11/4/2022'), departureDate: new Date('11/8/2022')} }, 
      {...fakeReservation, id: '00000002', stay: { arrivalDate: new Date('11/10/2022'), departureDate: new Date('11/12/2022') }},
      {...fakeReservation, id: '00000003', stay: { arrivalDate: new Date('11/10/2022'), departureDate: new Date('11/16/2022') }}
    ]

    const filter = new StayFilter({ arrivalDate: new Date('11/9/2022'), departureDate: new Date('11/13/2022') })
    reservations = reservations.filter(r => filter.apply(r));
    expect(reservations).toHaveLength(2)
    expect(reservations[0].id).toEqual('00000002')
    expect(reservations[1].id).toEqual('00000003')
  });

  test('stay filter with given date out of stay dates', () => {
    let reservations = [
      {...fakeReservation, id: '00000001', stay: { arrivalDate: new Date('11/4/2022'), departureDate: new Date('11/8/2022')} }, 
      {...fakeReservation, id: '00000002', stay: { arrivalDate: new Date('11/10/2022'), departureDate: new Date('11/12/2022') }},
      {...fakeReservation, id: '00000003', stay: { arrivalDate: new Date('11/10/2022'), departureDate: new Date('11/16/2022') }}
    ]

    const filter = new StayFilter({ arrivalDate: new Date('11/18/2022'), departureDate: new Date('11/19/2022') })
    reservations = reservations.filter(r => filter.apply(r));
    expect(reservations).toHaveLength(0)
  });

  test('extras filter with balcony', () => {
    let reservations = [
      {...fakeReservation, id: '00000001', extras: [Extra.BALCONY, Extra.BREAKFAST] }, 
      {...fakeReservation, id: '00000002', extras: [Extra.BALCONY, Extra.PARKING, Extra.WIFI] },
      {...fakeReservation, id: '00000003', extras: [Extra.BALCONY, Extra.TV, Extra.WIFI] }
    ]

    const filter = new ExtrasFilter([Extra.BALCONY])
    reservations = reservations.filter(r => filter.apply(r));
    expect(reservations).toHaveLength(3)
  });

  test('extras filter with breakfast', () => {
    let reservations = [
      {...fakeReservation, id: '00000001', extras: [Extra.BALCONY, Extra.BREAKFAST] }, 
      {...fakeReservation, id: '00000002', extras: [Extra.BALCONY, Extra.PARKING, Extra.WIFI] },
      {...fakeReservation, id: '00000003', extras: [Extra.BALCONY, Extra.TV, Extra.WIFI] }
    ]

    const filter = new ExtrasFilter([Extra.BREAKFAST])
    reservations = reservations.filter(r => filter.apply(r));
    expect(reservations).toHaveLength(1)
    expect(reservations[0].id).toEqual('00000001')
  });

  test('extras filter with WIFI', () => {
    let reservations = [
      {...fakeReservation, id: '00000001', extras: [Extra.BALCONY, Extra.BREAKFAST] }, 
      {...fakeReservation, id: '00000002', extras: [Extra.BALCONY, Extra.PARKING, Extra.WIFI] },
      {...fakeReservation, id: '00000003', extras: [Extra.BALCONY, Extra.TV, Extra.WIFI] }
    ]

    const filter = new ExtrasFilter([Extra.WIFI])
    reservations = reservations.filter(r => filter.apply(r));
    expect(reservations).toHaveLength(2)
    expect(reservations[0].id).toEqual('00000002')
    expect(reservations[1].id).toEqual('00000003')
  });

  test('extras filter with WIFI', () => {
    let reservations = [
      {...fakeReservation, id: '00000001', extras: [Extra.BALCONY, Extra.BREAKFAST] }, 
      {...fakeReservation, id: '00000002', extras: [Extra.BALCONY, Extra.PARKING, Extra.WIFI] },
      {...fakeReservation, id: '00000003', extras: [Extra.BALCONY, Extra.WIFI] }
    ]

    const filter = new ExtrasFilter([Extra.TV])
    reservations = reservations.filter(r => filter.apply(r));
    expect(reservations).toHaveLength(0)
  });
});