# 3.2 Interaction and Release Polish

This pass improves the production build without changing the verified 100-room campaign.

- Keyboard and gamepad focus navigation for canvas menus, settings, pause, results, and level cards.
- Visible focus rings and disabled-state protection.
- Press-and-hold touch movement with short haptic feedback.
- Fullscreen now includes the complete app surface and touch controls.
- Reduced motion freezes decorative animation, removes camera shake, limits particles, and accelerates movement transitions.
- Screen fade transitions make menu and room changes feel intentional.
- Web Audio now uses a dynamics compressor and a reusable noise buffer for cleaner, lower-GC playback.
- Service-worker caches are build-revisioned, clean up older game caches, use cache-first commercial assets, and preserve network-first application updates.
- PWA metadata now includes install display fallbacks, categories, and campaign/level shortcuts.
- Runtime regression tests verify all of the above in CI.
