import request from 'supertest';
import { expect } from '@jest/globals';
import e from 'express';
import App from '../../app';
import { Route } from '../enums/routes';
import IndexRoute from '../routes/routes';
import SearchController from './search';

const indexRoute = new IndexRoute();
const app = new App([indexRoute]);

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
});

describe(`[GET] ${Route.search}`, () => {
  it('Should respond with statusCode 200', () => request(app.getServer())
    .get(`${Route.search}`)
    .set('user-agent', 'node-superagent')
    .expect(200));

  it('Should throw an error and call next', async () => {
    const mockRequest = {} as e.Request;
    const mockResponse = {} as e.Response;
    const mockNext = jest.fn();
    const mockError = Error();
    mockResponse.render = () => { throw mockError; };
    const controller = new SearchController();
    await controller.search(mockRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
