import { APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { ExtrasFilter, Filter, FilterType, ReservationFilter, StayFilter } from './filters';
import { Extra, Reservation, Stay } from './reservation';

export class ResponseUtil {
  static getResponse(msg: string, data: object | string | undefined, statusCode: number): APIGatewayProxyResult {
    return {
      statusCode: statusCode,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: msg,
        data: data
      },null,2),
    } as APIGatewayProxyResult;
  }
}

export class JSONUtil {
  static toJSON(data: string | undefined | null) {
    if (data) {
      try {
        return JSON.parse(data)
      } catch (e) {
        console.log("event body is not in json format! (" + e + ")", data)
      }
    }
        
    return {}
  }

  static bufferToJSON(buffer: S3.Body) {
    try {
      return JSON.parse(buffer.toString('utf-8'))
    } catch (e) {
      console.log("cannot parse buffer to json! (" + e + ")", buffer)
    }
    return []
  }
}

export class FilterUtil {
  static parse(filters: Filter[]): ReservationFilter[] {
    return filters.map((filter: Filter) => {
      switch(filter.type) {
        case FilterType.Extras: return new ExtrasFilter(filter.data as Extra[]); 
        case FilterType.Stay: return new StayFilter(filter.data as Stay);
      }
    })
  }
}

const DEBUGGER = true;
export enum LogType {
    DEBUG, INFO, ERROR, WARN
}
  
export class SystemLogger { 
  static log(msg: string, data: Reservation | object | string | number | undefined = {}, type: LogType = LogType.DEBUG, force = false) { 
    if (DEBUGGER || force) {
      switch (type) {
        case LogType.DEBUG: console.log(msg, data); break;
        case LogType.INFO: console.info(msg, data); break;
        case LogType.ERROR: console.error(msg, data); break;
        case LogType.WARN: console.warn(msg, data); break;
      }
    }
  }
}