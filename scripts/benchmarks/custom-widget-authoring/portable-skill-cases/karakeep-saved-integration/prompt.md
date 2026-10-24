---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write]
---

Create the shipped Karakeep Recent Bookmarks widget using my saved Karakeep integration. Show at most eight newest unarchived bookmarks, handle link, text, asset, and unknown content without broken titles, and include favorite state, tags, summary or note fallbacks, cursor context, refresh, and complete loading, empty, error, and success states.

API notes I verified: Use the saved Karakeep integration and inherit its authentication. GET /api/v1/bookmarks with archived=false, sortOrder=desc, limit=8, includeContent=false returns {bookmarks,nextCursor}. content is a discriminated union: link has url/title, text has text/sourceUrl, asset has assetType/assetId, and unknown can have no useful payload.
Docs: https://docs.karakeep.app/api/karakeep-api/

Sample responses from my instance:

GET /api/v1/bookmarks:

```json
{
  "bookmarks": [
    {
      "id": "link-1",
      "title": "A useful article",
      "favourited": true,
      "summary": "A short generated summary.",
      "note": null,
      "tags": [
        {
          "id": "tag-1",
          "name": "reading"
        }
      ],
      "content": {
        "type": "link",
        "url": "https://example.com/article",
        "title": "A useful article"
      }
    },
    {
      "id": "text-1",
      "title": null,
      "favourited": false,
      "summary": null,
      "note": "Remember this",
      "tags": [],
      "content": {
        "type": "text",
        "text": "Short saved thought",
        "sourceUrl": null
      }
    },
    {
      "id": "asset-1",
      "title": null,
      "favourited": false,
      "summary": null,
      "note": null,
      "tags": [],
      "content": {
        "type": "asset",
        "assetType": "pdf",
        "assetId": "pdf-1"
      }
    },
    {
      "id": "unknown-1",
      "title": null,
      "favourited": false,
      "summary": null,
      "note": null,
      "tags": [],
      "content": {
        "type": "unknown"
      }
    }
  ],
  "nextCursor": null
}
```

Saved integrations in my Homarr:

- Synthetic karakeep (kind karakeep, id fixture-karakeep, full access true)

Homarr isn't connected to this chat, so give me the widget definition to import.
