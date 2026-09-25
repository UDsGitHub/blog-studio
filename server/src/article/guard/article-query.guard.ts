import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedRequest } from '../../guard/authenticated-request.interface';
import { ArticleStatus } from '../../generated/prisma/enums';
import { Response } from 'express';

@Injectable()
export class ArticleQueryGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const { status, startDate, endDate } = request.query;

    if (!request.isAuthenticated && !status) {
      throw new BadRequestException(
        'status is a required field for unauthenticated users',
      );
    }

    if (
      !request.isAuthenticated &&
      (status === ArticleStatus.DRAFT || status === ArticleStatus.ARCHIVED)
    ) {
      throw new UnauthorizedException();
    }

    if ((startDate || endDate) && !status) {
      throw new BadRequestException(
        'status is required when filtering by startDate or endDate',
      );
    }

    response.set(
      'Cache-control',
      request.isAuthenticated
        ? 'private, no-store'
        : 'public, max-age=0, s-maxage=60, stale-while-revalidate=30',
    );
    return true;
  }
}
