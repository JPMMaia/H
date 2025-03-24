import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper.js';

suite("Should get diagnostics", () => {

	test("Diagnoses parsing error", async () => {
		const document_uri = get_document_uri("diagnostics_parser_error.hltxt");
		await test_diagnostics(document_uri, [
			{ message: "Did not expect expression.", range: to_range(2, 0, 5, 1), severity: vscode.DiagnosticSeverity.Error, source: "Parser" },
		]);
	});

	test("Diagnoses incorrect float suffix", async () => {
		const document_uri = get_document_uri("diagnostics_float_suffix.hltxt");
		await test_diagnostics(document_uri, [
			{ message: "Did not expect 'f' as number suffix. Did you mean 'f16', 'f32' or 'f64'?", range: to_range(4, 12, 4, 16), severity: vscode.DiagnosticSeverity.Error, source: "Parse Tree Validation" },
		]);
	});

	test("Diagnoses missing members in an explicit instantiate expression", async () => {
		const document_uri = get_document_uri("diagnostics_missing_explicit_instantiate_members.hltxt");
		await test_diagnostics(document_uri, [
			{ message: "'My_struct.a' is not set. Explicit instantiate expression requires all members to be set.", range: to_range(10, 30, 10, 41), severity: vscode.DiagnosticSeverity.Error, source: "Parse Tree Validation" },
			{ message: "'My_struct.b' is not set. Explicit instantiate expression requires all members to be set.", range: to_range(10, 30, 10, 41), severity: vscode.DiagnosticSeverity.Error, source: "Parse Tree Validation" },
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
		assert.equal(actual_diagnostic.source, expected_diagnostic.source);
	});
}
