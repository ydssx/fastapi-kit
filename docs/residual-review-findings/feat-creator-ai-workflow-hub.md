# Residual Review Findings

Source: media-library review against `docs/plans/2026-07-10-001-feat-creator-media-library-plan.md`.

- P1 `app/services/creator_media_import.py:152` DNS rebinding can bypass URL-import SSRF checks. [#14](https://github.com/ydssx/fastapi-kit/issues/14)
- P1 `creator/src/pages/ProjectDetailPage.tsx:219` media association and draft insertion are not atomic. [#15](https://github.com/ydssx/fastapi-kit/issues/15)
- P1 `app/services/creator_image_generation.py:55` image generation has no quota reservation. [#16](https://github.com/ydssx/fastapi-kit/issues/16)
- P2 `app/services/creator_image_generation.py:84` dispatch failure can leave a permanent processing asset. [#17](https://github.com/ydssx/fastapi-kit/issues/17)
- P2 `app/services/creator_media.py:159` association does not validate editable projects and pipeline steps. [#18](https://github.com/ydssx/fastapi-kit/issues/18)
- P2 `creator/src/api/creator.ts:207` library and picker lack pagination. [#19](https://github.com/ydssx/fastapi-kit/issues/19)
- P1/P2 `app/clients/object_storage.py:52` preview URLs are neither immediately revocable on deletion nor TTL-aware in the frontend cache. [#20](https://github.com/ydssx/fastapi-kit/issues/20)
- P2 `app/services/creator_media.py:241` database failure can orphan an uploaded object. [#21](https://github.com/ydssx/fastapi-kit/issues/21)
- P2 `app/services/creator_media_import.py:62` header-only validation can accept malformed image containers. [#22](https://github.com/ydssx/fastapi-kit/issues/22)
