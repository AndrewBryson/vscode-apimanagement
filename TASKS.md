# Upgrade Tasks

Tracking the Node.js and dependency compatibility work for the Azure API Management extension.

## Completed

- [x] Replace `util.isNullOrUndefined` in `src/utils/nonNull.ts` with an explicit null/undefined check.
- [x] Replace deprecated `new Buffer()` usage in `src/extension.ts` with `Buffer.from()`.
- [x] Confirm the extension compiles with `npm run build`.
- [x] Confirm the production bundle builds with `npm run webpack-prod`.
- [x] Run the VS Code extension tests under Xvfb: 93 tests passing.
- [x] Search for additional deprecated Node.js `util` API usage.

## Deferred

- [ ] Upgrade Azure SDK and `@microsoft/vscode-azext-*` packages to current major versions.
  - A broad `npm update` introduced incompatible duplicate versions of `@microsoft/vscode-azext-utils` and caused TypeScript wizard-step type errors.
  - This requires a coordinated package upgrade and API migration rather than an unscoped dependency update.

## Known Follow-up

- [ ] Address existing TSLint errors in `test/transformApiToMcpServer.test.ts`.
- [ ] Review remaining npm audit vulnerabilities and deprecated transitive packages.
- [ ] Consider migrating from deprecated TSLint to ESLint as a separate modernization effort.

## Verification Notes

- Node.js runtime checked: v24.14.0.
- The original `util.isNullOrUndefined` API is undefined in Node.js v24.
- `npm test` completed successfully under `xvfb-run` with exit code 0.
- Production webpack output has warnings for optional `ws` packages (`bufferutil` and `utf-8-validate`), but the bundle completes successfully.
