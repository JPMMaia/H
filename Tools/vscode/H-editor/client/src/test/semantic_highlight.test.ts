import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should add semantic highlights", () => {
	test("Provides tokens for semantic_highlight_00.hltxt", async () => {
		const document_uri = get_document_uri("semantic_highlight_00.hltxt");
		await test_semantic_highlight(document_uri, {
			resultId: "",
			data: new Uint32Array([
				0, 1, 2 // TODO
			])
		});
	});
});

async function test_semantic_highlight(
	document_uri: vscode.Uri,
	expected_semantic_tokens: vscode.SemanticTokens
) {
	await activate(document_uri);

	const actual_semantic_tokens = (await vscode.commands.executeCommand(
		"vscode.provideDocumentSemanticTokens",
		document_uri
	)) as vscode.SemanticTokens;

	assert.ok(actual_semantic_tokens.data.length >= expected_semantic_tokens.data.length);
	expected_semantic_tokens.data.forEach((expected_token, index) => {
		const actual_token = actual_semantic_tokens.data[index];
		assert.equal(actual_token, expected_token);
	});
}
