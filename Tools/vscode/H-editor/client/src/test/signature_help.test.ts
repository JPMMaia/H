import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should display function signature", () => {
    test("Should show function signature with first parameter selected, and documentation 0", async () => {
        const document_uri = get_document_uri('signature_help_0.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 21), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show function signature with first parameter selected, and documentation 1", async () => {
        const document_uri = get_document_uri('signature_help_1.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 24), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show function signature with second parameter selected, and documentation 0", async () => {
        const document_uri = get_document_uri('signature_help_2.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 25), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show function signature with second parameter selected, and documentation 1", async () => {
        const document_uri = get_document_uri('signature_help_3.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 29), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });
});

function create_add_function_signature(): vscode.SignatureInformation {
    return {
        label: "add(lhs: Int32, rhs: Int32) -> (result: Int32)",
        parameters: [
            {
                label: [4, 14],
                documentation: "Left hand side of add expression"
            },
            {
                label: [16, 26],
                documentation: "Right hand side of add expression"
            }
        ],
        documentation: "Add two integers\n\nAdd two 32-bit integers.\nIt returns the result of adding lhs and rhs.",
        activeParameter: undefined
    };
}

async function test_signature_help(
    document_uri: vscode.Uri,
    position: vscode.Position,
    expected_signature_help: vscode.SignatureHelp
) {
    await activate(document_uri);

    const actual_signature_help = (await vscode.commands.executeCommand(
        'vscode.executeSignatureHelpProvider',
        document_uri,
        position
    )) as vscode.SignatureHelp;

    assert.deepEqual(actual_signature_help, expected_signature_help);
}
