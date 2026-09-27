import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/client';
import {
  MAX_BODY_LENGTH,
  MAX_EXCERPT_LENGTH,
  MAX_TITLE_LENGTH,
} from '../article.constants';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TITLE_LENGTH)
  title: string = '';

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_BODY_LENGTH)
  body: string = '';

  @IsString()
  @IsOptional()
  @MaxLength(MAX_EXCERPT_LENGTH)
  excerpt?: string = '';

  @IsEnum(ArticleStatus)
  @IsNotEmpty()
  status: ArticleStatus = 'DRAFT';
}
