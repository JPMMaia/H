/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite('Should do completion', () => {
	const document_uri = get_document_uri('completion.hltxt');

	/*test('Completes JS/TS in txt file', async () => {
		await test_completion(document_uri, new vscode.Position(0, 0), {
			items: [
				{ label: 'JavaScript', kind: vscode.CompletionItemKind.Text },
				{ label: 'TypeScript', kind: vscode.CompletionItemKind.Text }
			]
		});
	});*/
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

	assert.ok(actual_completion_list.items.length >= 2);
	expected_completion_list.items.forEach((expected_item, i) => {
		const actual_item = actual_completion_list.items[i];
		assert.equal(actual_item.label, expected_item.label);
		assert.equal(actual_item.kind, expected_item.kind);
	});
}
