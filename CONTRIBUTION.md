# Homarr Open Source Contribution Notes

## Project Information

* Repository: Homarr
* Issue: #3371 - Video backgrounds fail to upload as board backgrounds
* Local Environment: macOS (Apple Silicon)
* Package Manager: pnpm
* Browser: Brave
* Local App URL: http://localhost:3000

---

# Reproduction Process

## Environment Setup

### Development Environment

* OS: macOS (Apple Silicon)
* Package Manager: pnpm
* Browser: Brave
* Database: SQLite
* Additional Services: Redis, MySQL, PostgreSQL via Docker

### Setup Challenges and Resolutions

During environment setup, I encountered several issues that had to be resolved before reproducing the bug:

1. VS Code Dev Container Error
2. No Existing Dev Container Configuration
3. Docker Daemon Not Running
4. Redis Connection Errors
5. Missing SQLite Database Tables
6. Invalid SQLite Configuration
7. Port Already In Use
8. WebSocket Port Conflict
9. Existing Project Port Conflict (Medullo)

Detailed causes and fixes for each issue are documented in the **Setup Notes / Troubleshooting** section below.

---

## Steps to Reproduce

1. Start the required Docker services:

```bash
pnpm run docker:dev
```

2. Start Homarr:

```bash
pnpm dev
```

3. Open the application:

```text
http://localhost:3000
```

4. Complete onboarding.

5. Create or open a board.

6. Navigate to **Board Settings**.

7. Open the **Background Upload** section.

8. Attempt to upload an `.mp4` video file.

### Observed Behavior

* The file picker only accepts image files.
* Video files cannot be selected through the UI.
* The issue report indicates that when a video reaches the upload endpoint, backend validation rejects the file with an `invalidFileType` error.

### Expected Behavior

* Users should be able to select supported video formats such as `.mp4`.
* The upload should succeed.
* The uploaded video should be usable as a board background.

---

## Branch Link

Fork Repository:

```text
https://github.com/Isaaciyo/homarr-ai301-open-source
```

Working Branch:

```text
https://github.com/Isaaciyo/homarr-ai301-open-source/tree/fix-issue-3371
```

---

# Solution Approach

## Issue Summary

### Original Bug

When users attempt to upload a video file such as `.mp4` as a board background, the upload fails with a `400 Bad Request`.

The reported validation error indicates that only the following file types are accepted:

```text
image/png
image/jpeg
image/webp
image/gif
image/svg+xml
```

This means video MIME types such as `video/mp4` are currently rejected.

### Local Reproduction Findings

While testing locally, I discovered an additional frontend-level blocker.

The board background upload component only allows image files to be selected through the file picker. Because of this, users cannot currently select an `.mp4` file from the UI.

This suggests the issue exists at two levels:

1. Frontend file selection is restricted to image MIME types.
2. Backend upload validation also restricts uploads to image MIME types.

---

# UMPIRE Framework

## Understand

Board backgrounds currently support image uploads but do not properly support video uploads.

Users should be able to upload a supported video file, particularly `.mp4`, as a board background. Instead, the UI prevents video selection and the backend validation rejects video MIME types if a video reaches the upload endpoint.

Expected behavior:

```text
A user can upload an .mp4 file as a board background, save the setting, and see the video rendered as the board background.
```

Current behavior:

```text
The file picker only accepts images, and backend validation rejects video MIME types.
```

---

## Match

I looked for similar patterns in the codebase before implementing the fix.

### Patterns to Search For

1. Existing media upload validation.
2. Existing file type constants.
3. Existing board background image rendering.
4. Existing components that render video or media previews.
5. Existing tests for accepted/rejected MIME types.

### Search Commands

```bash
rg "uploadMedia" -n
rg "invalidFileType" -n
rg "image/png" -n
rg "accept=" apps/nextjs/src -n
rg "video/mp4|video/webm|<video|playsInline|autoplay|loop" -n
```

### Actual Code Paths Found

The search showed that the board background upload path uses shared media upload code:

* Board background settings UI:
  `apps/nextjs/src/app/[locale]/boards/[name]/settings/_background.tsx`
* Shared media upload button:
  `packages/forms-collection/src/upload-media/upload-media.tsx`
* Backend media upload validator:
  `packages/validation/src/media.ts`
* Upload mutation:
  `packages/api/src/router/medias/media-router.ts`
* Local media serving route:
  `apps/nextjs/src/app/api/user-medias/[id]/route.ts`
* Existing board background video rendering:
  `apps/nextjs/src/components/layout/background.tsx`

Important finding: video rendering already existed for URLs ending in video extensions such as `.mp4` and `.webm`. The missing pieces were upload validation, the file picker accept list, and local uploaded media URLs not including an extension.

---

## Plan

### Root Cause

The root cause appears to be image-only validation in both the frontend and backend upload flow.

#### Frontend

The board background upload component likely contains an `accept` attribute similar to:

```tsx
accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
```

This prevents users from selecting `.mp4` files.

#### Backend

The `media.uploadMedia` endpoint validates uploads against a list of allowed image MIME types and rejects video MIME types such as `video/mp4`.

### Proposed Fix

Rather than creating a separate upload field for videos, I will extend the existing board background upload flow to support both images and videos.

Implementation steps:

1. Update the board background file input to accept supported video MIME types.
2. Update backend validation to allow supported video MIME types.
3. Update board background rendering logic to support video backgrounds.
4. Add or update tests for video upload support.

### Proposed Supported Types

Existing image types:

```text
image/png
image/jpeg
image/webp
image/gif
image/svg+xml
```

Additional video types:

```text
video/mp4
video/webm
```

### Files Expected To Be Modified

#### Frontend

Search targets:

```bash
rg "background" apps/nextjs/src -n
rg "accept=" apps/nextjs/src -n
rg "uploadMedia" apps/nextjs/src -n
```

Expected changes:

* Update file input accepted MIME types.
* Update board background rendering if necessary.

#### Backend

Search targets:

```bash
rg "uploadMedia" packages -n
rg "invalidFileType" packages -n
rg "image/png" packages -n
```

Expected changes:

* Update upload validation to allow video MIME types.
* Preserve rejection of unsupported file types.

#### Tests

Search targets:

```bash
rg "uploadMedia|background|invalidFileType|media" test e2e packages apps -n
```

Expected changes:

* Add or update validation tests.
* Add or update UI/e2e tests if appropriate.(e2e = end-to-end)

---

## Implement

Implementation is in progress on the working branch.

Branch:

```text
fix-issue-3371
```

Pull Request:

```text
https://github.com/homarr-labs/homarr/pull/6139#issue-4779919975
```

### Pull Request Tracking

PR Link: https://github.com/homarr-labs/homarr/pull/6139#issue-4779919975

PR Description: This contribution fixes issue #3371 by allowing MP4/WebM uploads for board backgrounds, updating the background upload UI to accept videos, and ensuring uploaded local video URLs render through the existing video background component.

Maintainer Feedback: No feedback yet

Status: Awaiting review

Commit Message:

```text
fix: support video uploads for board backgrounds
```

### Implementation Notes

#### Implementation Progress

Current status: Phase III implementation and first automated test pass are complete.

* Added image and video MIME constants in `packages/validation/src/media.ts`.
* Allowed `video/mp4` and `video/webm` in backend media upload validation.
* Added `packages/validation/src/media.spec.ts` to verify MP4/WebM uploads are accepted and unsupported uploads are rejected.
* Expanded `packages/validation/src/media.spec.ts` to cover image upload regressions, invalid file type errors, and the 32 MB file size limit.
* Updated `UploadMedia` so callers can choose accepted MIME types while keeping image-only uploads as the default.
* Updated the board background settings upload button to accept both image and video media types.
* Updated board background picker previews to support videos.
* Preserved the existing board video renderer by making uploaded local media URLs include the original file extension, such as `/api/user-medias/<id>.mp4`.
* Updated the local media route so `/api/user-medias/<id>` and `/api/user-medias/<id>.<extension>` both resolve to the same stored media.
* Avoided adding video uploads to the local icon repository, because icons should remain image-only.
* Updated the media management table and copy/open actions to handle local video media URLs.
* Updated board documentation to mention MP4 and WebM background videos.

#### Files Modified

* `packages/validation/src/media.ts`
* `packages/validation/src/media.spec.ts`
* `packages/forms-collection/src/upload-media/upload-media.tsx`
* `packages/api/src/router/medias/media-router.ts`
* `packages/icons/src/repositories/local.icon-repository.ts`
* `apps/nextjs/src/app/api/user-medias/[id]/route.ts`
* `apps/nextjs/src/app/[locale]/boards/[name]/settings/_background.tsx`
* `apps/nextjs/src/app/[locale]/manage/medias/page.tsx`
* `apps/nextjs/src/app/[locale]/manage/medias/_actions/copy-media.tsx`
* `apps/docs/docs/management/boards/index.mdx`
* `CONTRIBUTION.md`

#### Key Commits

* `789b12d9` - `fix: support video uploads for board backgrounds`
* `f1f746d3` - `docs: update issue 3371 progress log`
* `b8f5bdde` - `test: cover media upload validation cases`
* `64393116` - `docs: record media validation test pass`
* `45e36931` - `docs: record video background manual check`

#### Implementation Decisions

* I did not make every `UploadMedia` usage accept video. The shared uploader now defaults to image-only so existing icon picker and media-manager behavior stays conservative.
* Board background upload opts into the full media list because this is the feature that needs video support.
* Local uploaded media URLs now include the source file extension when returned to the UI. This allows the existing `BoardBackgroundVideo` extension-based detection to work without rewriting the rendering layer.
* Videos are filtered out of local icon indexing to avoid treating MP4/WebM uploads as selectable app icons.

### Challenges Faced

* The first blocker was discovering that the UI and backend both rejected videos: the file picker was image-only and the backend validator allowed only image MIME types.
* The board already had a `BoardBackgroundVideo` component, but it only detected videos by URL extension. Uploaded local media URLs originally looked like `/api/user-medias/<id>` with no extension, so uploaded videos would not trigger the video renderer even after validation passed.
* The shared `UploadMedia` component is also used by the icon picker. To avoid allowing videos where images are expected, I added a caller-controlled `accept` list and kept the default image-only.
* Uploading videos to the media table also created a risk of treating videos as local icons. I filtered local icon indexing to image MIME types only.
* A TypeScript issue came up while testing custom Zod errors: `params` only exists on custom issues, so the test now narrows `issue.code === "custom"` before checking the i18n key.
* Git push was rejected because the remote branch had a duplicate contribution-notes commit with a different SHA. No push was completed yet; the branch needs a clean rebase or another integration choice before pushing.

Tools and commands that helped:

```bash
rg "uploadMedia" .
rg "invalidFileType" .
rg "image/png" .
rg "video/mp4|video/webm|<video|playsInline|autoplay|loop" .
pnpm exec vitest run packages/validation/src/media.spec.ts
pnpm -F @homarr/validation typecheck
```

---

## Review

Before submitting the pull request, I will:

* Read CONTRIBUTING.md and project guidelines.
* Follow existing TypeScript and React conventions.
* Reuse existing MIME type constants if available.
* Keep the fix scoped to board backgrounds.
* Verify existing image uploads still work.
* Verify unsupported file types remain blocked.
* Run linting, type checking, and tests.

Commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Verification Run

Targeted verification completed:

```bash
pnpm exec vitest run packages/validation/src/media.spec.ts
pnpm -F @homarr/validation typecheck
pnpm -F @homarr/forms-collection typecheck
pnpm -F @homarr/icons typecheck
pnpm -F @homarr/api typecheck
pnpm -F @homarr/nextjs typecheck
pnpm -F @homarr/validation lint
pnpm -F @homarr/forms-collection lint
pnpm -F @homarr/icons lint
pnpm -F @homarr/api lint
pnpm -F @homarr/nextjs lint
```

Results:

* New validation spec passed.
* Targeted package type checks passed.
* Targeted lint commands passed.
* Lint still reports pre-existing warnings elsewhere in the repository; no new blocking lint failures were introduced.

### Testing Strategy

I used existing Vitest patterns in `packages/validation/src/form/i18n.spec.ts` as a reference and added schema-level coverage beside the validator in `packages/validation/src/media.spec.ts`.

What the tests cover:

* The bug fix: `video/mp4` and `video/webm` uploads are accepted.
* Regressions: all existing supported image MIME types are still accepted.
* Edge cases: unsupported MIME types fail with `invalidFileType`.
* Edge cases: files larger than 32 MB fail with `fileTooLarge`.

### Test Pass: Media Validation

Added focused automated coverage for the media upload schema:

* Bug fix coverage: `video/mp4` and `video/webm` uploads are accepted.
* Regression coverage: existing image upload MIME types are still accepted.
* Edge cases: unsupported file types return the `invalidFileType` custom error, and files larger than 32 MB return the `fileTooLarge` custom error.

Commands run after this test update:

```bash
pnpm exec vitest run packages/validation/src/media.spec.ts
pnpm -F @homarr/validation typecheck
pnpm -F @homarr/validation lint
```

Result: all three commands passed.

---

## Evaluate

### Manual Verification

1. Start Docker services.
2. Start Homarr.
3. Upload valid image backgrounds and verify they still work.
4. Upload a valid `.mp4` background and verify:

   * The file can be selected.
   * The upload succeeds.
   * The video renders as the board background.
5. Upload an unsupported file type and verify validation still rejects it.

Status:

* Confirmed on localhost that an `.mp4` video can be selected, uploaded, saved as the board background, and rendered visibly on the board page.
* Still pending: manual re-check that existing image backgrounds continue to work.
* Still pending: manual re-check that unsupported file types are rejected in the UI/API flow.

### Automated Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Regression Checks

* Existing image backgrounds still work.
* Existing media uploads still work.
* Invalid file type validation still works.
* No new runtime errors are introduced.

---

# Setup Notes / Troubleshooting

Move all of your existing setup/debugging sections here:

* VS Code Dev Container Error
* No Existing Dev Container Configuration
* Docker Daemon Not Running
* Redis Connection Errors
* Database Tables Missing
* Invalid SQLite Configuration
* Port Already In Use
* WebSocket Port Conflict
* Medullo Project Port Conflict
