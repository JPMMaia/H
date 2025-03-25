import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = process.argv[2];

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = process.argv[3];

		const launchArgs: string[] = [
			"--disable-extensions",
			process.argv[4]
		];

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
