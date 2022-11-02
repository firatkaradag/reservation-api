import { describe, expect, test, jest, afterAll, afterEach, beforeEach } from '@jest/globals';
import { mock } from 'jest-mock-extended'
import { APIGatewayEvent, Context } from 'aws-lambda';
import { JSONUtil } from './utils';
import { Extra, Reservation, Stay } from './reservation';
import { fakeReservation } from './filter.spec';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';

import { 
  apiHandler, 
  createHandler, deleteHandler, readHandler, updateHandler, saveHandler,
  parseHandler, queryHandler, fetchHandler
} from './reservation-handlers';
import { StartSyncExecutionOutput } from 'aws-sdk/clients/stepfunctions';
import { ExtrasFilter, Filter, StayFilter } from './filters';

const ERROR_GENERIC_MESSAGE = "Please contact with system admin."

type SearchEvent = APIGatewayEvent & {
  data: {
    stay: Stay,
    extras: Extra[]
  }, 
  filters?: Filter[],
  reservations: Reservation[]
}

type CrudEvent = APIGatewayEvent & {
  reservations: Reservation[],
  reservation: Reservation,
  data: { id: string } | Reservation
}

type S3Event = CrudEvent & {
  s3BucketName: string,
  s3Key: string
}

describe('Reservation Handler', () => {
  const context = mock<Context>()
  const OLD_ENV = process.env
  AWSMock.setSDKInstance(AWS);

  beforeEach(() => {
    jest.resetModules()
    AWSMock.restore();
    process.env = { ...OLD_ENV }
  });

  afterAll(() => {
    jest.resetAllMocks()
  });
  afterEach(() => {
    jest.clearAllMocks();
    process.env = OLD_ENV;
  });

  test('api handler to check CRUD_STATEMACHINE_ARN env variable', async () => {
    const event = mock<APIGatewayEvent>()
    const result = await apiHandler(event)
    const data = JSONUtil.toJSON(result.body);
    expect(data.message).toBe(ERROR_GENERIC_MESSAGE)
  });

  describe('api handler after environment variables', () => {

    const fakeStartSyncExecutionOutput: StartSyncExecutionOutput = {
      executionArn: 'fake-arn',
      startDate: new Date(),
      stopDate: new Date(),
      status: 'successful'
    }

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...OLD_ENV, 
        CRUD_STATEMACHINE_ARN: 'fake-arn',
        SEARCH_STATEMACHINE_ARN: 'fake-search-arn',
        RESERVATION_S3_DB: 'fake-s3-db',
        RESERVATION_S3_JSON: 'fake-s3-json'
      }
    });

    afterEach(() => {
      jest.resetModules()
      AWSMock.restore()
    })

    test('api handler to check operation type error', async () => {
      const event = mock<APIGatewayEvent>()
      event.body = '{"data": "fake-data"}'
      const result = await apiHandler(event)
      const data = JSONUtil.toJSON(result.body);
      expect(result.statusCode).toBe(500)
      expect(data.message).toBe("missing operation type")
    });

    test('api handler to check step functions without output', async () => {
      const event = mock<APIGatewayEvent>()
      event.body = '{"operationType":"1", "data": "fake-data"}'
      
      AWSMock.mock('StepFunctions', 'startSyncExecution', (params, callback) => {
        callback(undefined, fakeStartSyncExecutionOutput)
      })

      const result = await apiHandler(event)
      const data = JSONUtil.toJSON(result.body);
      expect(result.statusCode).toBe(500)
      expect(data.message).toBe("Unexpected result: ")
    });

    test('api handler to check step functions with output', async () => {
      const event = mock<APIGatewayEvent>()
      event.body = '{"operationType":"1", "data": "fake-data"}'

      AWSMock.mock('StepFunctions', 'startSyncExecution', (params, callback) => {
        callback(undefined, {
          ...fakeStartSyncExecutionOutput,
          output: '{"result": "successfully completed"}'
        })
      })

      const response = await apiHandler(event)
      expect(response.statusCode).toBe(200)
      const body = JSONUtil.toJSON(response.body);
      expect(body.message).toBe("Operation successfully completed!")
    });
  })

  test('create handler', async () => {
    const event = mock<CrudEvent>()
    event.reservations = []
    event.reservation = fakeReservation
    await createHandler(event, context, (error, data) => {
      expect(data.reservations).toHaveLength(1)
      expect(data.reservations[0].id).not.toBeNull()
      expect(data.reservations[0].id).toEqual(data.reservation.id)
    })
  });

  test('read handler', async () => {
    const event = mock<CrudEvent>()
    event.reservations = [
      {...fakeReservation, id: '00000001'},
      {...fakeReservation, id: '00000002', firstName: 'Mock'},
      {...fakeReservation, id: '00000003'}
    ]
    event.data = { id: '00000002' } 
    await readHandler(event, context, (error, data) => {
      expect(data.result).toBeTruthy()
      expect(data.result.id).toStrictEqual('00000002')
      expect(data.result.firstName).toStrictEqual('Mock')
    })
  });

  test('update handler', async () => {
    const event = mock<CrudEvent>()
    event.reservations = [
      {...fakeReservation, id: '00000001'},
      {...fakeReservation, id: '00000002'},
      {...fakeReservation, id: '00000003'}
    ]
    event.data = { ...fakeReservation, id: '00000003', firstName: 'Mock' } 
    await updateHandler(event, context, (error, data) => {
      expect(data.reservations).toBeTruthy()
      expect(data.reservations[2].id).toStrictEqual('00000003')
      expect(data.reservations[2].firstName).toStrictEqual('Mock')
    })
  });

  test('delete handler', async () => {
    const event = mock<CrudEvent>()
    event.reservations = [
      {...fakeReservation, id: '00000001'},
      {...fakeReservation, id: '00000002'},
      {...fakeReservation, id: '00000003'}
    ]
    event.data = { id: '00000002' } 
    await deleteHandler(event, context, (error, data) => {
      expect(data.reservations).toHaveLength(2)
      expect(data.reservations[0].id).toStrictEqual('00000001')
      expect(data.reservations[1].id).toStrictEqual('00000003')
    })
  });

  test('save handler', async () => {
    const event = mock<S3Event>()
    event.s3BucketName = 'fake-bucket'
    event.s3Key = 'fake-key'
    event.reservations = [
      {...fakeReservation, id: '00000001'},
      {...fakeReservation, id: '00000002'},
      {...fakeReservation, id: '00000003'}
    ]

    AWSMock.mock('S3', 'putObject', (params, callback) => {
      callback(undefined, {})
    })

    const data = await saveHandler(event)
    expect(data).not.toBeNull()
  });


  describe('search operation', () => {

    const reservations = [
      {...fakeReservation, id: '00000001', 
        stay: {arrivalDate: new Date('11/6/2022'), departureDate: new Date('11/13/2022')}},
      {...fakeReservation, id: '00000002', extras: [Extra.PARKING],
        stay: {arrivalDate: new Date('11/10/2022'), departureDate: new Date('11/12/2022')}},
      {...fakeReservation, id: '00000003', extras: [Extra.PARKING, Extra.WIFI]}
    ]

    test('parse handler', async () => {
      const event = mock<SearchEvent>()
      const stay = {arrivalDate: new Date('11/4/2022'), departureDate: new Date('11/4/2022')};
      const extras = [Extra.BREAKFAST]
      event.data = {
        stay: stay,
        extras: extras
      }
      await parseHandler(event, context, (error, data) => {
        expect(data.filters).toHaveLength(2)
        expect(data.filters[0].type).toStrictEqual(0)
        expect(data.filters[0].data).toStrictEqual(extras)
        expect(data.filters[1].type).toStrictEqual(1)
        expect(data.filters[1].data).toStrictEqual(stay)
      })
    });

    test('query handler', async () => {
      const event = mock<S3Event>()
      event.s3BucketName = 'fake-bucket'
      event.s3Key = 'fake-key'

      AWSMock.mock('S3', 'getObject', (params, callback) => {
        callback(undefined, { 
          Body: JSON.stringify(reservations)
        })
      })
      const response = await queryHandler(event);
      const list = JSONUtil.bufferToJSON(JSON.stringify(reservations))
      expect(response.reservations).toHaveLength(3)
      expect(response.reservations).toEqual(list)
    });

    test('fetch handler for parking and date filter', async () => {
      const event = mock<SearchEvent>()
      const stay = {arrivalDate: new Date('11/1/2022'), departureDate: new Date('11/21/2022')};
      const extras = [Extra.PARKING]

      event.filters = [new StayFilter(stay), new ExtrasFilter(extras)]
      event.reservations = reservations

      await fetchHandler(event, context, (error, data) => {
        expect(data.result).toHaveLength(2)
        expect(data.result[0].id).toStrictEqual("00000002")
        expect(data.result[1].id).toStrictEqual("00000003")
      })
    });
  })
});