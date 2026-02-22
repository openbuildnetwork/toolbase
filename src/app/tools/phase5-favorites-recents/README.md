# Phase 5 — Tool Favorites & Recents

## Purpose

Makes Toolbase feel personalized from the very first return visit.
Users can heart-favourite any tool and see their last-visited tools surfaced automatically.

## How It Works

### localStorage Keys

| Key                  | Type       | Content                                                            |
| -------------------- | ---------- | ------------------------------------------------------------------ |
| `toolbase:favorites` | `string[]` | Tool IDs the user has favorited, e.g. `['magic-pdf', 'pixel-axe']` |
| `toolbase:recents`   | `string[]` | Up to 5 most-recently visited tool IDs, newest first               |

### Files Created / Modified

| File                                        | Role                                                             |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `src/hooks/useToolPreferences.ts`           | Core hook — favorites, recents, toggleFavorite, addRecent        |
| `src/components/ui/FavoriteButton.tsx`      | Heart toggle button layered on each ToolCard                     |
| `src/components/ui/PersonalizedGallery.tsx` | Animated Favorites + Recents sections on home page               |
| `src/components/ui/ToolPageTracker.tsx`     | Zero-UI client component that calls addRecent on tool page mount |
| `src/components/ui/ToolCard.tsx`            | Updated to render FavoriteButton                                 |
| `src/types/tool-search.ts`                  | Added `toolId?` and `toolFolderName?` to ToolCardProps           |
| `src/app/page.tsx`                          | Renders PersonalizedGallery above the main tools grid            |
| `src/app/(tools)/*/layout.tsx`              | All 10 layouts now include ToolPageTracker                       |

## Behavior

- **Heart button** appears on every tool card on hover (always visible if already favorited)
- **Favorites section** appears at the top of the gallery when ≥1 tool is favorited
- **Recently Used section** appears below favorites showing up to 5 tools (tools already in favorites are excluded to avoid duplication)
- **Neither section renders** if both lists are empty
- **Unfavoriting** removes the tool from the section immediately with an animated exit
- **Cross-tab sync** via the native `storage` event

## Privacy Guarantee

100% localStorage only. No network requests, no server, no analytics.
All data stays on the user's device. Clearing browser storage removes all preferences.

## Limits

- Max 5 recently used tools stored
- No limit on favorites (user can favorite all tools)
