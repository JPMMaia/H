import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should get definition location", () => {

    test("Gets definition location for itself (struct)", async () => {
        const document_uri = get_document_uri("definition_0.hltxt");
        await test_definitions(document_uri, new vscode.Position(2, 9), [
            new vscode.Location(get_document_uri("definition_0.hltxt"), to_range(2, 7, 2, 16))
        ]);
    });

    test("Gets definition location for input parameter type", async () => {
        const document_uri = get_document_uri("definition_0.hltxt");
        await test_definitions(document_uri, new vscode.Position(7, 22), [
            new vscode.Location(get_document_uri("definition_0.hltxt"), to_range(2, 7, 2, 16))
        ]);
    });

    test("Gets definition location for output parameter type", async () => {
        const document_uri = get_document_uri("definition_0.hltxt");
        await test_definitions(document_uri, new vscode.Position(7, 43), [
            new vscode.Location(get_document_uri("definition_0.hltxt"), to_range(2, 7, 2, 16))
        ]);
    });

    test("Gets definition location for variable declaration type", async () => {
        const document_uri = get_document_uri("definition_0.hltxt");
        await test_definitions(document_uri, new vscode.Position(9, 21), [
            new vscode.Location(get_document_uri("definition_0.hltxt"), to_range(2, 7, 2, 16))
        ]);
    });

    test("Gets definition location of struct member 0", async () => {
        const document_uri = get_document_uri("definition_1.hltxt");
        await test_definitions(document_uri, new vscode.Position(11, 9), [
            new vscode.Location(get_document_uri("definition_1.hltxt"), to_range(4, 4, 4, 5))
        ]);
    });

    test("Gets definition location of struct member 1", async () => {
        const document_uri = get_document_uri("definition_1.hltxt");
        await test_definitions(document_uri, new vscode.Position(12, 8), [
            new vscode.Location(get_document_uri("definition_1.hltxt"), to_range(5, 4, 5, 5))
        ]);
    });
});

function to_range(start_line: number, start_character: number, end_line: number, end_character: number): vscode.Range {
    const start = new vscode.Position(start_line, start_character);
    const end = new vscode.Position(end_line, end_character);
    return new vscode.Range(start, end);
}

async function test_definitions(document_uri: vscode.Uri, position: vscode.Position, expected_definitions: vscode.Location[]) {
    await activate(document_uri);

    const actual_definitions = (await vscode.commands.executeCommand(
        'vscode.executeDefinitionProvider',
        document_uri,
        position
    )) as vscode.Location[];

    assert.equal(actual_definitions.length, expected_definitions.length);

    expected_definitions.forEach((expected_definition, i) => {
        const actual_definition = actual_definitions[i];

        assert.equal(actual_definition.uri.toString(), expected_definition.uri.toString());
        assert.deepEqual(actual_definition.range, expected_definition.range);
    });
}