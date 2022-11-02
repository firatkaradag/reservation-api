import {describe, expect, test, jest} from '@jest/globals';
import { ExtrasFilter, Filter, StayFilter } from './filters';
import { Extra } from './reservation';
import { FilterUtil, JSONUtil, LogType, ResponseUtil, SystemLogger } from './utils';

describe('Utils', () => {

  const ERROR_GENERIC_MESSAGE = "Please contact with system admin."
  const SUCCESS_MESSAGE = "Operation successfully completed!"

  test('get response for 500 generic message', () => {
    const result = ResponseUtil.getResponse(ERROR_GENERIC_MESSAGE, {}, 500)
    expect(result.statusCode).toBe(500)
    const data = JSONUtil.toJSON(result.body);
    expect(data.message).toBe(ERROR_GENERIC_MESSAGE)
  });

  test('get response for 200', () => {
    const result = ResponseUtil.getResponse(SUCCESS_MESSAGE, {}, 200)
    expect(result.statusCode).toBe(200)
    const data = JSONUtil.toJSON(result.body);
    expect(data.message).toBe(SUCCESS_MESSAGE)
  });

  test('get {} json with exception', () => {
    const spy = jest.spyOn(console, 'log')
    const data = JSONUtil.toJSON('this is not a json file');
    expect(data).toStrictEqual({})
    expect(spy).toBeCalled()
  });

  test('get empty json with undefined param', () => {
    const data = JSONUtil.toJSON(undefined);
    expect(data).toStrictEqual({})
  });

  test('get empty json with null param', () => {
    const data = JSONUtil.toJSON(null);
    expect(data).toStrictEqual({})
  });

  test('get json from buffer', () => {
    const b = Buffer.from('{"note": "fake data"}')
    const data = JSONUtil.bufferToJSON(b);
    expect(data).toBeTruthy()
    expect(data.note).toStrictEqual('fake data')
  });

  test('get [] from base64 buffer with exception', () => {
    const spy = jest.spyOn(console, 'log')
    const data = JSONUtil.bufferToJSON(Buffer.from('[{"note": "fake data"}]').toString('base64'));
    expect(data).toStrictEqual([])
    expect(spy).toBeCalled()
  });

  test('parse reservation filter from filter', async () => {
    const filters: Filter[] = [
      new StayFilter({ arrivalDate: new Date('11/9/2022'), departureDate: new Date('11/13/2022') }),
      new ExtrasFilter([Extra.BREAKFAST])
    ]
    const reservationFilters = FilterUtil.parse(filters)
    expect(reservationFilters).toHaveLength(2)
  });

  test('system logger with info type', async () => {
    const spy = jest.spyOn(console, 'info')
    SystemLogger.log("Fake log", {}, LogType.INFO)
    expect(spy).toBeCalled()
  });

  test('system logger with debug type', async () => {
    const spy = jest.spyOn(console, 'log')
    SystemLogger.log("Fake log", {}, LogType.DEBUG)
    expect(spy).toBeCalled()
  });

  test('system logger with error type', async () => {
    const spy = jest.spyOn(console, 'error')
    SystemLogger.log("Fake log", {}, LogType.ERROR)
    expect(spy).toBeCalled()
  });

  test('system logger with warn type', async () => {
    const spy = jest.spyOn(console, 'warn')
    SystemLogger.log("Fake log", {}, LogType.WARN)
    expect(spy).toBeCalled()
  });

  test('system logger with force', async () => {
    const spy = jest.spyOn(console, 'log')
    SystemLogger.log("Fake log", {}, LogType.DEBUG, true)
    expect(spy).toBeCalled()
  });
});

