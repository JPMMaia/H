import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should do completion", () => {
	test("Completes 'module' at the beginning of file", async () => {
		const document_uri = get_document_uri('completion_00.hltxt');
		await test_completion(document_uri, new vscode.Position(0, 0), {
			items: [
				{ label: 'module', kind: vscode.CompletionItemKind.Keyword }
			]
		});
	});

	test("Completes after module declaration", async () => {
		const document_uri = get_document_uri('completion_01.hltxt');
		await test_completion(document_uri, new vscode.Position(2, 0), {
			items: [
				{ label: "enum", kind: vscode.CompletionItemKind.Keyword },
				{ label: "export", kind: vscode.CompletionItemKind.Keyword },
				{ label: "function", kind: vscode.CompletionItemKind.Keyword },
				{ label: "import", kind: vscode.CompletionItemKind.Keyword },
				{ label: "struct", kind: vscode.CompletionItemKind.Keyword },
				{ label: "union", kind: vscode.CompletionItemKind.Keyword },
				{ label: "using", kind: vscode.CompletionItemKind.Keyword },
			]
		});
	});
});

async function test_completion(
	document_uri: vscode.Uri,
	position: vscode.Position,
	expected_completion_list: vscode.CompletionList
) {
	await activate(document_uri);

	// Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
	const actual_completion_list = (await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		document_uri,
		position
	)) as vscode.CompletionList;

	assert.ok(actual_completion_list.items.length >= expected_completion_list.items.length);
	expected_completion_list.items.forEach((expected_item, i) => {
		const actual_item = actual_completion_list.items[i];
		assert.equal(actual_item.label, expected_item.label);
		assert.equal(actual_item.kind, expected_item.kind);
	});
}
