# image-catalog

App Store visual assets. Three tiers: **what you upload**, **what it was made
from**, and **what it replaced**.

Every filename carries its pixel dimensions, so the right file for a slot can be
picked without opening it.

## app-store/ — the upload set

| Folder                | Files                                 | Slot                                          |
| --------------------- | ------------------------------------- | --------------------------------------------- |
| `screenshots/`        | `aura-01`…`aura-08` @ 1242x2688       | 6.5" iPhone screenshots                       |
| `iap-review/`         | annual · monthly · weekly @ 1242x2688 | Review screenshot per subscription product    |
| `subscription-promo/` | `aura-subscription` @ 1024x1024       | Auto-renewable subscription promotional image |

There are **eight** distinct screenshots. An `aura-09` existed but was a
pixel-identical re-export of `aura-01`, so it was removed — if nine were
intended, the ninth still needs to be made.

The three `iap-review` images are genuinely different from one another (each
shows its own plan selected); they are not interchangeable.

## sources/ — masters, kept for re-export

| Folder                  | Contents                                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screenshot-masters/`   | The 2640x5736 Figma exports. `aura-0N-master` is the master for `app-store/screenshots/aura-0N` — the mapping was verified by image comparison, not by filename. |
| `iap-review-originals/` | The raw ~853x1844 renders behind each `iap-review` final.                                                                                                        |
| `promo-variants/`       | Two rejected subscription-promo directions: orb-only, and orb-with-wordmark. Neither shipped — `app-store/subscription-promo/` did.                              |

## archive/ — superseded

`2026-08-19-paywall-draft` is an earlier paywall render, replaced by the
2026-08-20 `iap-review` set. Kept only for reference; safe to delete.

## Housekeeping

Duplicates were identified by comparing decoded pixels, not file hashes — every
copy here had been re-encoded, so no two files were ever byte-identical even
when the images were the same. Before any duplicate was deleted, its content was
confirmed present in the file that survived.
