# Deployment

## Environments

There are no deployed mobile, web, or API environments and no application environment URLs to publish. GitHub Actions verifies pushes and pull requests; it does not deploy a product.

## Build and verification

Use the pinned Node/npm versions and run:

```sh
npm ci
npm run verify
```

The [workflow](../.github/workflows/verify.yml) uses the same command. [CONTRIBUTING.md](../CONTRIBUTING.md) owns setup and individual checks.

## Release and rollback

No application release or rollback command exists. Define deployment targets, credentials, staging checks, promotion controls, and rollback procedures with the corresponding feature/release slice in the [MVP design](design/active/2026-10-14-lets-farty-mvp-design.md). Repository protection and deployment environments are separate account settings.
