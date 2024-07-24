import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should get instantiate expression code actions", () => {

    test("Gets add missing instantiate fields code action", async () => {
        const document_uri = get_document_uri("code_action_instantiate_0.hltxt");
        await test_code_actions(document_uri, to_range(12, 30, 12, 32), vscode.CodeActionKind.RefactorRewrite, [
            {
                title: "Add missing instantiate members",
                kind: vscode.CodeActionKind.RefactorRewrite
            }
        ]);
    });
});

function to_range(start_line: number, start_character: number, end_line: number, end_character: number): vscode.Range {
    const start = new vscode.Position(start_line, start_character);
    const end = new vscode.Position(end_line, end_character);
    return new vscode.Range(start, end);
}

async function test_code_actions(document_uri: vscode.Uri, range_or_selection: vscode.Range | vscode.Selection, kind: vscode.CodeActionKind, expected_code_actions: vscode.CodeAction[]) {
    await activate(document_uri);

    const actual_code_actions = (await vscode.commands.executeCommand(
        'vscode.executeCodeActionProvider',
        document_uri,
        range_or_selection
    )) as vscode.CodeAction[];

    assert.equal(actual_code_actions.length, expected_code_actions.length);

    expected_code_actions.forEach((expected_code_action, i) => {
        const actual_code_action = actual_code_actions[i];

        assert.equal(actual_code_action.title, expected_code_action.title);
        assert.equal(actual_code_action.kind, expected_code_action.kind);
        assert.deepEqual(actual_code_action.edit, expected_code_action.edit);
    });
}