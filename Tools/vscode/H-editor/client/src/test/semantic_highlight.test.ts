import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';
import { client } from "../extension";

interface Decoded_semantic_token {
	line: number;
	character: number;
	length: number;
	token_type: string;
	token_modifiers: string[];
}

suite("Should add semantic highlights", () => {
	test("Provides tokens for semantic_highlight_00.hltxt", async () => {
		const document_uri = get_document_uri("semantic_highlight_00.hltxt");
		await test_semantic_highlight(document_uri, [
			{ line: 0, character: 0, length: 6, token_type: "keyword", token_modifiers: [] },
			{ line: 0, character: 7, length: 9, token_type: "namespace", token_modifiers: ["declaration"] },
			{ line: 0, character: 16, length: 1, token_type: "operator", token_modifiers: [] },
		]);
	});
});

async function test_semantic_highlight(
	document_uri: vscode.Uri,
	expected_decoded_semantic_tokens: Decoded_semantic_token[]
) {
	await activate(document_uri);

	const actual_semantic_tokens = (await vscode.commands.executeCommand(
		"vscode.provideDocumentSemanticTokens",
		document_uri
	)) as vscode.SemanticTokens;

	const legend = client.initializeResult.capabilities.semanticTokensProvider.legend;
	const actual_decoded_semantic_tokens = decode_semantic_tokens(actual_semantic_tokens.data, legend);

	assert.ok(actual_decoded_semantic_tokens.length >= expected_decoded_semantic_tokens.length);
	expected_decoded_semantic_tokens.forEach((expected_token, index) => {
		const actual_token = actual_decoded_semantic_tokens[index];
		assert.deepEqual(actual_token, expected_token);
	});
}

function decode_semantic_tokens(data: Uint32Array, legend: vscode.SemanticTokensLegend): Decoded_semantic_token[] {
	const tokens: Decoded_semantic_token[] = [];
	let line = 0;
	let character = 0;

	for (let i = 0; i < data.length; i += 5) {
		const delta_line = data[i];
		const delta_start = data[i + 1];
		const length = data[i + 2];
		const token_type_index = data[i + 3];
		const token_modifier_set = data[i + 4];

		line += delta_line;
		character = delta_line === 0 ? character + delta_start : delta_start;

		const token_type = legend.tokenTypes[token_type_index];
		const token_modifiers = decode_modifiers(token_modifier_set, legend.tokenModifiers);

		tokens.push({
			line,
			character,
			length,
			token_type,
			token_modifiers
		});
	}

	return tokens;
}

function decode_modifiers(token_modifier_set: number, token_modifiers: string[]): string[] {
	const modifiers = [];
	for (let i = 0; i < token_modifiers.length; i++) {
		if (token_modifier_set & (1 << i)!) {
			modifiers.push(token_modifiers[i]);
		}
	}
	return modifiers;
}
