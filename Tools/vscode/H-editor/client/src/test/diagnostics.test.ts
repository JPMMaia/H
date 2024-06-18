import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite('Should get diagnostics', () => {
	const document_uri = get_document_uri('diagnostics.hltxt');

	test('Diagnoses parsing error', async () => {
		await test_diagnostics(document_uri, [
			{ message: "Did not expect '{'.", range: to_range(3, 0, 3, 1), severity: vscode.DiagnosticSeverity.Error, source: 'hlang' },
		]);
	});
});

function to_range(sLine: number, sChar: number, eLine: number, eChar: number) {
	const start = new vscode.Position(sLine, sChar);
	const end = new vscode.Position(eLine, eChar);
	return new vscode.Range(start, end);
}

async function test_diagnostics(document_uri: vscode.Uri, expected_diagnostics: vscode.Diagnostic[]) {
	await activate(document_uri);

	const actual_diagnostics = vscode.languages.getDiagnostics(document_uri);

	assert.equal(actual_diagnostics.length, expected_diagnostics.length);

	expected_diagnostics.forEach((expected_diagnostic, i) => {
		const actual_diagnostic = actual_diagnostics[i];
		assert.equal(actual_diagnostic.message, expected_diagnostic.message);
		assert.deepEqual(actual_diagnostic.range, expected_diagnostic.range);
		assert.equal(actual_diagnostic.severity, expected_diagnostic.severity);
	});
}