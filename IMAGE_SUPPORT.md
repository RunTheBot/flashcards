# Image Support Implementation

## Overview

Automatic image support has been added to the flashcard system using the **Hack Club CDN**. When users include images in their flashcard markdown, the images are automatically uploaded to the CDN and the URLs are replaced.

## How It Works

### 1. **Markdown Image Syntax**
Users can include images in flashcards using standard markdown syntax:

```markdown
![Description](https://example.com/image.jpg)
```

### 2. **Automatic CDN Upload**
When a flashcard is created or updated, the system:
- Parses the markdown for image URLs
- Uploads external images to Hack Club CDN (cdn.hackclub.com)
- Replaces the original URLs with permanent CDN URLs
- Stores the updated markdown in the database

### 3. **Hack Club CDN Integration**
The implementation uses the [Hack Club CDN API](https://github.com/hackclub/cdn):
- **Endpoint**: `POST https://cdn.hackclub.com/api/v3/new`
- **Authentication**: Bearer token (required)
- **Features**: SHA-based deduplication, permanent storage, fast delivery

## Files Modified

### New Files
- **`src/lib/cdn-upload.ts`**: Core CDN upload functionality
  - `extractImageUrls()` - Parses markdown for image URLs
  - `uploadToCDN()` - Uploads images to Hack Club CDN
  - `replaceImageUrls()` - Replaces original URLs with CDN URLs
  - `processMarkdownImages()` - Main function that orchestrates the process

### Modified Files
- **`src/server/api/routers/flashcards.ts`**: 
  - Updated `createCard` mutation to process images before saving
  - Updated `updateCard` mutation to process images before saving
  - Updated `generateFlashcards` mutation to process AI-generated images
  
- **`src/env.js`**: 
  - Added `HACKCLUB_CDN_TOKEN` environment variable

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
HACKCLUB_CDN_TOKEN="your-api-token-here"
```

**Getting a Token:**
1. Join the [Hack Club Slack](https://hackclub.com/slack)
2. Visit the [#cdn channel](https://app.slack.com/client/T0266FRGM/C016DEDUL87)
3. Request an API token

**Note**: The system gracefully handles missing tokens by skipping CDN upload and keeping original URLs.

## Features

### ✅ What's Supported
- Standard markdown image syntax: `![alt](url)`
- External image URLs (http/https)
- Automatic deduplication (SHA-based)
- Works with:
  - Manual card creation
  - Card editing
  - AI-generated flashcards

### ❌ What's Skipped
- Data URIs (base64 images) - kept as-is
- Images already on cdn.hackclub.com - no re-upload
- Invalid/inaccessible URLs - silently skipped

## Example Usage

### Creating a Card with Images

```markdown
# Front of card
What does this flag represent?

![Hack Club Flag](https://assets.hackclub.com/flag-standalone.svg)

# Back of card
The Hack Club flag represents teenage developers building amazing things!
```

**Result**: The image URL is automatically uploaded to CDN:
```
https://cdn.hackclub.com/s/v3/64a9472006c4472d7ac75f2d4d9455025d9838d6_flag-standalone.svg
```

### Multiple Images

```markdown
Compare these two flags:

![Flag 1](https://example.com/flag1.png)
![Flag 2](https://example.com/flag2.png)

What's the difference?
```

Both images are uploaded in a single batch request to the CDN.

## Benefits

1. **Permanence**: Images are stored permanently on Hack Club's CDN
2. **Speed**: Fast global delivery via CDN
3. **Reliability**: No broken links from external sources
4. **Deduplication**: Same image = same URL (SHA-based)
5. **Privacy**: No tracking from third-party image hosts
6. **Simplicity**: Automatic - users just paste image URLs

## Technical Details

### API Flow

1. User creates/edits flashcard with image URLs
2. Frontend sends markdown to backend via tRPC
3. Backend calls `processMarkdownImages()`:
   - Extracts image URLs via regex
   - Sends batch request to Hack Club CDN API
   - Receives permanent CDN URLs
   - Replaces URLs in markdown
4. Updated markdown saved to database
5. Frontend renders markdown with CDN images

### Error Handling

- **Missing Token**: Skip CDN upload, keep original URLs
- **Upload Failure**: Skip CDN upload, keep original URLs
- **Invalid URLs**: Skip specific URLs, process others
- **Network Errors**: Graceful fallback to original URLs

All errors are logged but don't block flashcard creation.

## Future Enhancements

Possible improvements:
1. **File Upload UI**: Direct image upload instead of URL pasting
2. **Image Compression**: Optimize images before CDN upload
3. **Paste Image**: Clipboard image support
4. **Drag & Drop**: Visual image upload interface
5. **Image Gallery**: Preview/manage uploaded images
6. **Analytics**: Track image usage/bandwidth

## Troubleshooting

### Images Not Uploading?

1. Check `HACKCLUB_CDN_TOKEN` is set in `.env`
2. Verify token is valid (test with curl):
   ```bash
   curl -X POST https://cdn.hackclub.com/api/v3/new \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '["https://assets.hackclub.com/flag-standalone.svg"]'
   ```
3. Check server logs for error messages
4. Ensure image URLs are publicly accessible

### Images Display as Broken?

1. Check markdown syntax: `![alt](url)` 
2. Verify URL is valid and accessible
3. Check browser console for CORS/mixed content errors
4. Ensure CDN URLs are being saved (check database)

## Resources

- [Hack Club CDN Documentation](https://github.com/hackclub/cdn)
- [Hack Club Slack #cdn channel](https://app.slack.com/client/T0266FRGM/C016DEDUL87)
- [Markdown Image Syntax](https://www.markdownguide.org/basic-syntax/#images-1)
