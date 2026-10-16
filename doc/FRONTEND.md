# Frontend Conventions

## Stack and current state

No mobile app or share-page code exists. Expo/React Native with TypeScript is proposed in the [MVP design](design/active/2026-10-14-lets-farty-mvp-design.md); the tooling runtime does not establish approval of that application stack.

## Component structure and state

Choose component, navigation, and state conventions in the separate foundation app-shell plan. Create `apps/mobile/` with that feature rather than importing sample frontend scaffolding from a template.

## Platform verification

The foundation slice must demonstrate launches on iOS and Android. Recording, playback, permissions, identity, and sharing require the platform and behavioral checks in their consuming feature plans. The current Node verification command checks repository tooling, not native application behavior.
