# Vault Secrets & Final Polish — 3.5

## Design goals

The easter eggs are optional, persistent, and solution-neutral. They never move an entity, spend a key, change a par score, unlock a campaign room, or alter enemy behavior.

## Six discoveries

1. **64K Archive** — a C64-inspired display mode activated through classic or textual input. It can be toggled without affecting saves or puzzles.
2. **Pocket Pip** — a title-screen name callback with a production VFX and audio reward.
3. **Lucky Seven** — a patient title-logo interaction.
4. **Room 64K** — an idle-memory echo in room 64.
5. **Null Memo** — a hidden antagonist message in the credits/final flow.
6. **Perfect Light** — awarded for earning all 300 Prism Stars.

## Integration

- Discoveries persist inside the existing campaign save.
- The credits screen includes a spoiler-light secret ledger.
- The title screen reports discovery progress.
- Screen-reader status announcements include secret notifications.
- Archive mode is synchronized through the app DOM state and remains compatible with reduced motion and high contrast.
- A dedicated regression test verifies every trigger, persistence, audio cue, and secret count.

## Release safety

All secrets are decoupled from the deterministic puzzle state and are excluded from level solution grading. The full 100-room solver and enemy-route replay remain authoritative.
