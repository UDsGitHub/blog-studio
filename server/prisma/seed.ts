import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ArticleStatus,
  PrismaClient,
} from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

type SeedArticle = {
  title: string;
  slug: string;
  status: ArticleStatus;
  excerpt: string;
  body: string;
  /** Required for PUBLISHED and ARCHIVED (once-published). */
  publishedAt?: Date;
};

const articles: SeedArticle[] = [
  {
    title: 'Getting Started with the Studio',
    slug: 'getting-started-with-the-studio',
    status: ArticleStatus.PUBLISHED,
    excerpt: 'A short walkthrough of the editor and publish flow.',
    body: `## Hello

This is a **published** sample post with enough markdown to exercise the preview.

- Lists
- Bold and _italic_
- A short paragraph for scrolling and excerpts.

\`\`\`ts
const greeting = 'hello studio';
\`\`\`
`,
    publishedAt: new Date('2026-09-01T12:00:00.000Z'),
  },
  {
    title: 'Why Cursor Pagination Beats Offset',
    slug: 'why-cursor-pagination-beats-offset',
    status: ArticleStatus.PUBLISHED,
    excerpt: 'Stable pages when rows are inserted ahead of the reader.',
    body: `Offset pagination drifts when new rows appear. Cursor pagination (limit + cursorId) keeps the next page anchored to the last seen id.

Useful when the studio list is infinite-scroll and mutated often.`,
    publishedAt: new Date('2026-09-02T12:00:00.000Z'),
  },
  {
    title: 'Markdown Checklist for Authors',
    slug: 'markdown-checklist-for-authors',
    status: ArticleStatus.PUBLISHED,
    excerpt:
      'Headings, links, images, and code fences that consumers can render.',
    body: `### Checklist

1. One H1 via the title field, not the body
2. Prefer relative links for internal posts
3. Keep code fences language-tagged
4. Write an excerpt when the auto-derived one is weak`,
    publishedAt: new Date('2026-09-03T12:00:00.000Z'),
  },
  {
    title: 'ETag and Cache-Control on Public Reads',
    slug: 'etag-and-cache-control-on-public-reads',
    status: ArticleStatus.PUBLISHED,
    excerpt: 'Conditional requests plus a short s-maxage window.',
    body: `Public list/detail can send \`Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate\` and weak ETags. Webhooks still drive Next revalidation; this bounds stale anonymous traffic.`,
    publishedAt: new Date('2026-09-04T12:00:00.000Z'),
  },
  {
    title: 'Webhook Payload Shape',
    slug: 'webhook-payload-shape',
    status: ArticleStatus.PUBLISHED,
    excerpt: 'Small signed JSON for portfolio revalidate.',
    body: `Events: published, unpublished, updated, deleted. Sign the exact body string with HMAC-SHA256 and send \`X-Webhook-Signature\`.`,
    publishedAt: new Date('2026-09-05T12:00:00.000Z'),
  },
  {
    title: 'Draft: Notes on Redis Versioning',
    slug: 'draft-notes-on-redis-versioning',
    status: ArticleStatus.DRAFT,
    excerpt: 'Scratch notes — not ready to publish.',
    body: `Bump \`articles:version\` on every write so browse/search/slug keys miss stale entries. TTL still expires unreachable keys.`,
  },
  {
    title: 'Unpublished ideas for tags',
    slug: 'unpublished-ideas-for-tags',
    status: ArticleStatus.DRAFT,
    excerpt: '',
    body: `Tags as \`text[]\` with GIN later. Filter drawer shares space with date range. Do not ship until list + search filters are wired.`,
  },
  {
    title: 'Draft: Sidebar filter drawer copy',
    slug: 'draft-sidebar-filter-drawer-copy',
    status: ArticleStatus.DRAFT,
    excerpt: 'UX copy experiments.',
    body: `Hide the filter button until there is more than one filter. Date range first; tags later.`,
  },
  {
    title: 'Draft: Cover image upload flow',
    slug: 'draft-cover-image-upload-flow',
    status: ArticleStatus.DRAFT,
    excerpt: 'Cloudinary direct upload notes.',
    body: `Browser uploads to Cloudinary; article stores secure_url. Body images are markdown URLs. Revisit CSP img-src when this lands.`,
  },
  {
    title: 'Draft: Archive tab empty state',
    slug: 'draft-archive-tab-empty-state',
    status: ArticleStatus.DRAFT,
    excerpt: '',
    body: `Archived implies once published. Draft → Archived is blocked. Empty state copy: "Nothing archived yet."`,
  },
  {
    title: 'Slug History and Consumer Redirects',
    slug: 'slug-history-and-consumer-redirects',
    status: ArticleStatus.ARCHIVED,
    excerpt: 'Old URLs keep working after a title rename.',
    body: `When \`publishedAt\` was ever set, renaming inserts the old slug into history. Consumers compare requested slug to current slug and permanentRedirect.`,
    publishedAt: new Date('2026-08-10T12:00:00.000Z'),
  },
  {
    title: 'Rate Limits and Trust Proxy',
    slug: 'rate-limits-and-trust-proxy',
    status: ArticleStatus.ARCHIVED,
    excerpt: 'Short and long throttlers for write vs read.',
    body: `Set \`TRUST_PROXY\` correctly behind Railway so client IPs are real. Misconfigured trust proxy buckets everyone as one IP.`,
    publishedAt: new Date('2026-08-12T12:00:00.000Z'),
  },
  {
    title: 'Search vs Browse in the Studio',
    slug: 'search-vs-browse-in-the-studio',
    status: ArticleStatus.ARCHIVED,
    excerpt: 'Two tools, two response shapes.',
    body: `Browse is cursor-paged. Search is top-N by relevance with \`ts_headline\` — no hasMore. Command palette should not expect browse pagination fields.`,
    publishedAt: new Date('2026-08-14T12:00:00.000Z'),
  },
  {
    title: 'Health Checks for Postgres and Redis',
    slug: 'health-checks-for-postgres-and-redis',
    status: ArticleStatus.ARCHIVED,
    excerpt: 'Terminus pings both dependencies.',
    body: `GET /health returns 503 when either check fails. Useful for orchestrators; not a substitute for app-level 503 on DB-down article routes.`,
    publishedAt: new Date('2026-08-16T12:00:00.000Z'),
  },
];

async function main() {
  console.log(`Seeding ${articles.length} articles...`);

  for (const article of articles) {
    const row = await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        body: article.body,
        excerpt: article.excerpt,
        status: article.status,
        publishedAt: article.publishedAt ?? null,
        updatedAt: new Date(),
      },
      create: {
        title: article.title,
        slug: article.slug,
        body: article.body,
        excerpt: article.excerpt,
        status: article.status,
        publishedAt: article.publishedAt ?? null,
      },
    });

    console.log(`OK  ${row.status.padEnd(9)} ${row.slug}`);
  }

  const counts = await prisma.article.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log(
    'Done.',
    Object.fromEntries(counts.map((c) => [c.status, c._count])),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
