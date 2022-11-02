import { APIGatewayProxyResult, APIGatewayEvent, Callback } from 'aws-lambda';
import { StepFunctions, S3 } from 'aws-sdk';
import { StartSyncExecutionInput } from 'aws-sdk/clients/stepfunctions';
import { ResponseUtil, JSONUtil, SystemLogger, FilterUtil } from './utils';
import { v4 as uuid } from 'uuid';
import { Extra, Reservation, ReservationShort, Stay } from './reservation'
import { ExtrasFilter, Filter, ReservationFilter, StayFilter } from './filters';

enum OperationType {
  NONE=0, SEARCH=1, CREATE=2, READ=3, UPDATE=4, DELETE=5
}

const awsConfig = { region: 'us-east-1'}
const s3 = new S3(awsConfig)

export const apiHandler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

  const ERROR_GENERIC_MESSAGE = "Please contact with system admin."
  if (!process.env.CRUD_STATEMACHINE_ARN) {
    SystemLogger.log('State Machine ARN is misconfigured. Cannot be empty.')
    return ResponseUtil.getResponse(ERROR_GENERIC_MESSAGE, {}, 500)
  }
  if (!process.env.SEARCH_STATEMACHINE_ARN) {
    SystemLogger.log('Search State Machine ARN is misconfigured. Cannot be empty.')
    return ResponseUtil.getResponse(ERROR_GENERIC_MESSAGE, {}, 500)
  }
  if (!process.env.RESERVATION_S3_DB) {
    SystemLogger.log('S3 Reference cannot be empty.')
    return ResponseUtil.getResponse(ERROR_GENERIC_MESSAGE, {}, 500)
  }
  if (!process.env.RESERVATION_S3_JSON) {
    SystemLogger.log('S3 JSON file name cannot be empty.')
    return ResponseUtil.getResponse(ERROR_GENERIC_MESSAGE, {}, 500)
  }
  const body = JSONUtil.toJSON(event.body)
  if (!body) {
    SystemLogger.log('missing parameters')
    return ResponseUtil.getResponse(ERROR_GENERIC_MESSAGE, {}, 500)
  }
  const operationType: OperationType = body["operationType"];
  const data: Reservation = body["data"];
  const pageStart: number = body["pageStart"];
  const pageSize: number = body["pageSize"];
  if (!operationType) {
    return ResponseUtil.getResponse("missing operation type", {}, 500)
  }
  const stepfunctions = new StepFunctions(awsConfig)
  const stateMachineArn = operationType == OperationType.SEARCH ? 
    process.env.SEARCH_STATEMACHINE_ARN! : process.env.CRUD_STATEMACHINE_ARN!
  const params: StartSyncExecutionInput = {
    stateMachineArn: stateMachineArn,
    input: JSON.stringify({
      operationType: operationType,
      data: data,
      s3BucketName: process.env.RESERVATION_S3_DB,
      s3Key: process.env.RESERVATION_S3_JSON,
      pageStart: pageStart ?? 0,
      pageSize: pageSize ?? 5,
      pagination: !!(pageStart && pageSize)
    })
  }
  SystemLogger.log('starting params: ', params);
  const response = await stepfunctions.startSyncExecution(params).promise()
  if (response && response.error) {
    return ResponseUtil.getResponse("State Machine throws an error: ", response.error, 500)
  }
  const output = JSONUtil.toJSON(response.output);
  if (output && output.result) {
    return ResponseUtil.getResponse("Operation successfully completed!", output.result, 200)
  }
  return ResponseUtil.getResponse("Unexpected result: ", response.output, 500)
};

type StateMachineEvent = {
  reservations: Reservation[];
  data: Reservation;
}
export const createHandler = (event: StateMachineEvent, callback: Callback) => { 
  SystemLogger.log('operation create event: ', event)
  const reservations: Reservation[] = event.reservations ?? [];
  const reservation: Reservation = event.data ?? null;
  
  if (reservation) {
    reservation.id = uuid()
    reservations.push(reservation);
  }
  callback(null, {...event, reservations: reservations, reservation: reservation });
};

export const readHandler = (event: StateMachineEvent, callback: Callback) => {
  SystemLogger.log('operation read event: ', event)
  const reservations: Reservation[] = event.reservations ?? [];
  const reservation = reservations.find(r => r.id == event.data.id)
  SystemLogger.log('operation read reservation: ', reservation)
  callback(null, {...event, result: reservation });
};

export const updateHandler = (event: StateMachineEvent, callback: Callback) => {
  SystemLogger.log('operation update event: ', event)
  let reservations: Reservation[] = event.reservations ?? [];
  const reservation: Reservation = event.data ?? null
  if (reservation) {
    reservations = reservations.map(r => r.id == reservation.id ? reservation : r);
  }
  
  callback(null, {...event, reservations: reservations, reservation: reservation });
};

export const deleteHandler = (event: StateMachineEvent, callback: Callback) => {
  SystemLogger.log('operation delete event: ', event)
  let reservations: Reservation[] = event.reservations ?? [];
  const reservationId: string | undefined = event.data.id;
  if (reservationId) {
    reservations = reservations.filter(r => r.id != reservationId);
  }
  callback(null, {...event, reservations: reservations });
};

type StateMachineS3Event = StateMachineEvent & {
  reservation: Reservation;
  s3BucketName: string;
  s3Key: string;
}
export const saveHandler = async (event: StateMachineS3Event) => {
  const reservations: Reservation[] = event.reservations ?? [];
  SystemLogger.log("reservations: ", reservations);
  if (event.s3BucketName && event.s3Key) {
    const response = await s3.putObject({
      Bucket: event.s3BucketName, 
      Key: event.s3Key,
      Body: JSON.stringify(reservations)
    }).promise()
    SystemLogger.log("response: ", response);
  }

  return { result: event.reservation ? event.reservation : true };
};

type StateMachineFilterEvent = {
  data: { extras: Extra[], stay: Stay };
}
export const parseHandler = (event: StateMachineFilterEvent, callback: Callback) => { 
  
  const filters: Filter[] = [];
  if (event && event.data) {
    if (event.data.extras && event.data.extras.length > 0) {
      filters.push(new ExtrasFilter(event.data.extras))
    }
    if (event.data.stay && event.data.stay.arrivalDate && event.data.stay.departureDate) {
      filters.push(new StayFilter(event.data.stay))
    }
  }
  SystemLogger.log("parse: filters: ", filters);
  callback(null, {...event, filters: filters });
};

export const queryHandler = async (event: StateMachineS3Event) => {
  let reservations: Reservation[] = []
  if (event.s3BucketName && event.s3Key) {
    const response = await s3.getObject({Bucket: event.s3BucketName, Key: event.s3Key}).promise()
    SystemLogger.log("response: ", response);
    if (response && response.Body) {
      reservations = JSONUtil.bufferToJSON(response.Body)
    }
  }
  SystemLogger.log("reservations: ", reservations);
  const output = {...event, reservations: reservations }
  SystemLogger.log("output: ", output);
  return output;
};

type StateMachineInputEvent = StateMachineS3Event & {
  filters: Filter[],
  pagination: boolean,
  pageStart: number,
  pageSize: number,
}
export const fetchHandler = (event: StateMachineInputEvent, callback: Callback) => {
  
  let reservations: Reservation[] = event.reservations ?? [];
  SystemLogger.log("reservations: ", reservations);
  const filters: ReservationFilter[] = FilterUtil.parse(event.filters ?? [])
  SystemLogger.log("filters: ", filters);
  filters
    .map((filter: ReservationFilter) => {
      reservations = reservations.filter((reservation:Reservation) => filter.apply(reservation))
    })

  SystemLogger.log("filtered reservations: ", reservations);
  if (event.pagination && event.pageStart && event.pageSize) {
    const start = event.pageStart + event.pageSize
    const end = event.pageStart + event.pageSize
    if (end < reservations.length) {
      reservations = reservations.slice(start, end);
    }
  }

  const reservationShortList: ReservationShort[] = reservations.map(r => r as ReservationShort);
  SystemLogger.log("reservationShortList: ", reservationShortList);
  callback(null, {...event, result: reservations });
};
