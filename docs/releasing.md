# Release process

Releases are maintainer-only. The repository deliberately keeps `private: true`
until Luan approves the first npm publication.

## Gates for `0.1.0-beta.1`

- Complete and record the maintainer dogfood protocol in at least two owned
  projects.
- Complete and record the two TypeScript comprehension sessions.
- Complete and record the webhook-operator session.
- Resolve repeated misunderstandings according to `validation.md`.
- Make the GitHub repository public.
- Run `npm run release:check` from a clean checkout.
- Review `npm pack --dry-run` for secrets and unintended files.
- Confirm the package version and changelog agree.

## Why the first publish is different

[npm can only configure a trusted publisher for a package that already exists](https://docs.npmjs.com/cli/v11/commands/npm-trust/).
The first version therefore requires one interactive publication from Luan's
npm account with two-factor authentication. Every later version can use
[GitHub Actions OIDC](https://docs.npmjs.com/trusted-publishers/) without a
long-lived npm token.

## First npm publication

1. Enable two-factor authentication on Luan's npm account and run `npm login`.
2. Remove `private: true` only after explicitly approving publication.
3. Run `npm run release:check` and `npm pack --dry-run` again.
4. Publish the prerelease with `npm publish --tag beta`.
5. On npm, configure GitHub Actions as the trusted publisher for:
   - owner: `luantaraschi`;
   - repository: `eventlaw`;
   - workflow: `release.yml`;
   - environment: `npm`;
   - allowed action: `npm publish`.
6. Require two-factor authentication and disallow traditional publish tokens.
7. Create the GitHub `npm` environment and optionally require Luan's approval.
8. Create and push tag `v0.1.0-beta.1`. The workflow sees that npm already has
   the version, skips duplicate publication, and creates the GitHub release.

The first interactive version does not receive OIDC provenance. Trusted
publishing generates provenance automatically for later releases when both the
repository and package are public.

## Later releases

1. Update the version and changelog in a focused maintainer commit.
2. Run `npm run release:check`.
3. Push the commit and wait for CI.
4. Create an exact `v<package-version>` tag and push it.
5. Approve the `npm` environment deployment if protection is enabled.
6. Verify the npm version, provenance, GitHub release, and installation command.

The workflow rejects a tag that does not exactly match `package.json`. It runs
the full release gate, removes the private guard only inside the release runner,
publishes with OIDC, and creates release notes after npm succeeds.

## Recovery

Do not silently reuse or overwrite a released version. If a release is broken,
deprecate it on npm with a clear message, fix forward under a new version, and
record the incident in the changelog. Unpublishing is reserved for security or
legal emergencies because it can break downstream installs.
