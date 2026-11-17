import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('adds an x-request-id response header', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.headers['x-request-id']).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
  });

  it('returns a consistent error body for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      path: '/missing',
    });
    expect(response.body.requestId).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
  });

  afterEach(async () => {
    await app.close();
  });
});
