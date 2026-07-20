# Release Checklist

## Automated

- `npm run check` passes
- all 100 levels are unique, structurally reachable, and mechanically solvable
- every campaign mechanic and all eight enemy families are represented
- JavaScript syntax checks pass
- SVG production assets parse as valid XML

## Browser

- title screen renders at the 1280×720 logical resolution
- comic pages advance by pointer and keyboard
- chapter directory locks and unlocks correctly
- room movement, undo, restart, hint, pause, options, and fullscreen respond
- no runtime exceptions during title → comic → room flow
- touch controls appear on coarse pointers
- sound starts only after a user gesture
- reduced motion and high contrast remain usable

## Content

- key art, logo, icon, and hero model sheet are final original vectors
- every room has a unique name, hint, par, and chapter role
- victory, defeat, ending, credits, and chapter-directory copy are final
- no stock, licensed, or placeholder content is included

## Platform follow-up

- enable GitHub Pages with GitHub Actions as the source
- test Safari, Firefox, Chrome, and mobile browsers
- add gamepad remapping and localization before platform submission
- perform external puzzle QA and accessibility review
