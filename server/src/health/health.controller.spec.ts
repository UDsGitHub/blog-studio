jest.mock('@nestjs/terminus', () => ({
  HealthCheckService: class HealthCheckService {},
  PrismaHealthIndicator: class PrismaHealthIndicator {},
  HealthCheck: () => () => undefined,
}));

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  const healthCheckService = {
    check: jest.fn(),
  };
  const prismaHealth = {
    pingCheck: jest.fn(),
  };
  const redisHealth = {
    pingCheck: jest.fn(),
  };
  const prisma = {};
  const redis = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisHealthIndicator, useValue: redisHealth },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('runs the prisma ping check', async () => {
    const expected = { status: 'ok' };
    healthCheckService.check.mockResolvedValue(expected);

    await expect(controller.check()).resolves.toBe(expected);

    const [indicators] = healthCheckService.check.mock.calls[0] as [
      Array<() => unknown>,
    ];
    await indicators[0]();
    expect(prismaHealth.pingCheck).toHaveBeenCalledWith('database', prisma);
  });

  it('runs the redis ping check', async () => {
    const expected = { status: 'ok' };
    healthCheckService.check.mockResolvedValue(expected);

    await expect(controller.check()).resolves.toBe(expected);

    const [indicators] = healthCheckService.check.mock.calls[0] as [
      Array<() => unknown>,
    ];
    await indicators[1]();
    expect(redisHealth.pingCheck).toHaveBeenCalledWith('redis', redis);
  });
});
