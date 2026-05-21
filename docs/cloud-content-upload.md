# Cloud Content Upload

Finapple can load finance content from Supabase instead of bundling large media files in the repo.

## 1. Create The Table

Run `supabase/content_items.sql` in the Supabase SQL editor.

## 2. Create Storage Bucket

Create a public Supabase Storage bucket, for example:

```text
content-media
```

Suggested folder layout:

```text
content-media/
  comics/world-economy-004/
    1.png
    2.png
    3.png
  money-pictures/episode-001/
    thumbnail.jpg
    episode.mp4
```

Copy each public file URL from Supabase Storage and paste it into `content_items`.

## 3. Card News / Comic Example

```sql
insert into public.content_items (
  id,
  title,
  subtitle,
  summary,
  category,
  badge,
  icon,
  content_type,
  source_label,
  read_time,
  updated_at_label,
  sort_order,
  published,
  card_news
) values (
  'world-economy-comic-004',
  '만화로 보는 세계 경제 4화',
  'Finapple Original',
  '세계 경제 이슈를 만화 카드뉴스로 짧고 쉽게 읽어봅니다.',
  '세계 이슈',
  'Finapple Original',
  '🌍',
  'card_news',
  'Finapple',
  '3분',
  '2026-05',
  400,
  true,
  '[
    {"src":"https://YOUR_SUPABASE_URL/storage/v1/object/public/content-media/comics/world-economy-004/1.png","alt":"만화로 보는 세계 경제 4화 1장"},
    {"src":"https://YOUR_SUPABASE_URL/storage/v1/object/public/content-media/comics/world-economy-004/2.png","alt":"만화로 보는 세계 경제 4화 2장"}
  ]'::jsonb
);
```

## 4. Money Pictures Video + Article Example

```sql
insert into public.content_items (
  id,
  title,
  subtitle,
  summary,
  category,
  badge,
  icon,
  content_type,
  source_label,
  source_url,
  thumbnail_url,
  video_url,
  body,
  read_time,
  updated_at_label,
  sort_order,
  published,
  learning_points
) values (
  'money-pictures-episode-001',
  '돈 픽쳐스: 첫 번째 머니 스토리',
  'Money Pictures 협업 콘텐츠',
  '돈 픽쳐스가 전하는 금융 이야기를 영상과 글로 함께 봅니다.',
  '금융 상식',
  'Money Pictures',
  '🎬',
  'video_article',
  'Money Pictures',
  'https://money-pictures.example',
  'https://YOUR_SUPABASE_URL/storage/v1/object/public/content-media/money-pictures/episode-001/thumbnail.jpg',
  'https://YOUR_SUPABASE_URL/storage/v1/object/public/content-media/money-pictures/episode-001/episode.mp4',
  '여기에 본문 글을 넣습니다.\n\n문단을 나누고 싶으면 줄바꿈을 그대로 넣으면 됩니다.',
  '5분',
  '2026-05',
  500,
  true,
  '[
    {"emoji":"🎞️","title":"영상 핵심","content":"영상에서 다룬 핵심 메시지를 정리합니다."},
    {"emoji":"💡","title":"생각해보기","content":"내 소비나 저축 습관에 어떻게 적용할 수 있을지 생각해봅니다."}
  ]'::jsonb
);
```

## 5. Publishing Workflow

1. Upload media files to Supabase Storage.
2. Insert or update a `content_items` row.
3. Set `published = true`.
4. The app will load the item automatically from `/api/content/items`.

Use `sort_order` to place important content higher. Larger numbers appear first.
