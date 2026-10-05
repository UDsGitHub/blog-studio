import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/client';
import { ArticlePreview } from '../article.types';
import { ApiProperty } from '@nestjs/swagger';
import { ArticlePreviewEntity } from '../article.entity';

export class BrowseArticlesQueryDto {
  @IsOptional()
  @IsUUID('4')
  cursorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @IsEnum(ArticleStatus)
  status!: ArticleStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export class BrowseArticlesResponseDto {
  @ApiProperty({ type: [ArticlePreviewEntity] })
  @IsArray()
  data: ArticlePreview[] = [];

  @ApiProperty()
  @IsBoolean()
  hasMore: boolean = false;
}
