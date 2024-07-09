import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should get inlay hints", () => {

	test("Creates hint for variable declaration expression", async () => {
		const document_uri = get_document_uri("inlay_hints_0.hltxt");
		await test_inlay_hints(document_uri, to_range(4, 4, 4, 14), [
			{
				label: [
					{
						value: ": ",
						tooltip: undefined
					},
					{
						value: "Int32",
						tooltip: "Built-in type: Int32"
					}
				],
				position: new vscode.Position(4, 9)
			},
		]);
	});

	test("Creates hint for variable declaration of a struct", async () => {
		const document_uri = get_document_uri("inlay_hints_1.hltxt");
		await test_inlay_hints(document_uri, to_range(17, 4, 17, 35), [
			{
				label: [
					{
						value: ": ",
						tooltip: undefined
					},
					{
						value: "Complex",
						tooltip: "struct Complex\nModule: my_module\n\nRepresents a complex type\nwith real and imaginary parts",
						location: {
							uri: document_uri,
							range: to_range(4, 0, 5, 0)
						}
					}
				],
				position: new vscode.Position(17, 15)
			},
		]);
	});
});

function to_range(start_line: number, start_character: number, end_line: number, end_character: number): vscode.Range {
	const start = new vscode.Position(start_line, start_character);
	const end = new vscode.Position(end_line, end_character);
	return new vscode.Range(start, end);
}

async function test_inlay_hints(document_uri: vscode.Uri, range: vscode.Range, expected_inlay_hints: vscode.InlayHint[]) {
	await activate(document_uri);

	const actual_inlay_hints = (await vscode.commands.executeCommand(
		'vscode.executeInlayHintProvider',
		document_uri,
		range
	)) as vscode.InlayHint[];

	assert.equal(actual_inlay_hints.length, expected_inlay_hints.length);

	expected_inlay_hints.forEach((expected_inlay_hint, i) => {
		const actual_inlay_hint = actual_inlay_hints[i];
		assert.deepEqual(actual_inlay_hint.label, expected_inlay_hint.label);
		assert.deepEqual(actual_inlay_hint.position, expected_inlay_hint.position);
	});
}