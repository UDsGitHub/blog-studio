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

    const { status } = request.query;

    if (!status) {
      throw new BadRequestException('status is a required field');
    }

    if (
      !request.isAuthenticated &&
      (status === ArticleStatus.DRAFT || status === ArticleStatus.ARCHIVED)
    ) {
      throw new UnauthorizedException();
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
