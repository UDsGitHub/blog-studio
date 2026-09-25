import {
  BadRequestException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ArticleQueryGuard } from './article-query.guard';
import { ArticleStatus } from '../../generated/prisma/enums';

describe('Article Query Guard', () => {
  let guard: ArticleQueryGuard;
  const getRequest = jest.fn();
  const set = jest.fn();
  const getResponse = () => ({ set });
  const context = {
    switchToHttp: () => ({ getRequest, getResponse }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ArticleQueryGuard();
  });

  it('missing status throws 400 when unauthenticated', () => {
    getRequest.mockReturnValue({ isAuthenticated: false, query: {} });
    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    expect(set).not.toHaveBeenCalled();
  });

  it('missing status returns true when authenticated', () => {
    getRequest.mockReturnValue({ isAuthenticated: true, query: {} });
    expect(guard.canActivate(context)).toBe(true);
    expect(set).toHaveBeenCalledWith('Cache-control', 'private, no-store');
  });

  it('DRAFT | ARCHIVED fetch throws 401 when unauthenticated', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: { status: ArticleStatus.DRAFT },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: { status: ArticleStatus.ARCHIVED },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(set).not.toHaveBeenCalled();
  });

  it('DRAFT | ARCHIVED returns true when authenticated', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: { status: ArticleStatus.DRAFT },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: { status: ArticleStatus.ARCHIVED },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(set).toHaveBeenCalledWith('Cache-control', 'private, no-store');
  });

  it('throws 400 when date range filter are passed without status', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: { endDate: new Date('2026-09-10') },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: {
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-10'),
      },
    });

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    expect(set).not.toHaveBeenCalled();
  });

  it('returns true when date range filters are passed with status', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: {
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-10'),
        status: ArticleStatus.PUBLISHED,
      },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: {
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-10'),
        status: ArticleStatus.DRAFT,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(set).toHaveBeenNthCalledWith(
      1,
      'Cache-control',
      'public, max-age=0, s-maxage=60, stale-while-revalidate=30',
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      'Cache-control',
      'private, no-store',
    );
  });

  it('returns true when status only passed', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: {
        status: ArticleStatus.PUBLISHED,
      },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: {
        status: ArticleStatus.DRAFT,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(set).toHaveBeenNthCalledWith(
      1,
      'Cache-control',
      'public, max-age=0, s-maxage=60, stale-while-revalidate=30',
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      'Cache-control',
      'private, no-store',
    );
  });
});
