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

I will look for similar patterns in the codebase before implementing the fix.

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

Implementation will occur in Phase III.

Branch:

```text
fix/video-board-background-upload
```

Pull Request:

```text
TODO: Add PR link after implementation
```

Commit Message:

```text
fix: support video uploads for board backgrounds
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
