import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should display function signature", () => {
    test("Should show function signature with first parameter selected, and documentation 0", async () => {
        const document_uri = get_document_uri('signature_help_function_0.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 21), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show function signature with first parameter selected, and documentation 1", async () => {
        const document_uri = get_document_uri('signature_help_function_1.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 24), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show function signature with second parameter selected, and documentation 0", async () => {
        const document_uri = get_document_uri('signature_help_function_2.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 25), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show function signature with second parameter selected, and documentation 1", async () => {
        const document_uri = get_document_uri('signature_help_function_3.hltxt');
        await test_signature_help(document_uri, new vscode.Position(17, 29), {
            signatures: [create_add_function_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show function signature of imported function", async () => {
        const document_uri = get_document_uri('projects/project_1/signature_help_function_0.hltxt');
        await test_signature_help(document_uri, new vscode.Position(8, 24), {
            signatures: [create_complex_add_function_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
        await test_signature_help(document_uri, new vscode.Position(8, 27), {
            signatures: [create_complex_add_function_signature()],
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

function create_complex_add_function_signature(): vscode.SignatureInformation {
    return {
        label: "add(lhs: complex.Complex, rhs: complex.Complex) -> (result: complex.Complex)",
        parameters: [
            {
                label: [4, 24],
                documentation: undefined
            },
            {
                label: [26, 46],
                documentation: undefined
            }
        ],
        documentation: undefined,
        activeParameter: undefined
    };
}

suite("Should display struct signature", () => {
    test("Should show struct signature 0", async () => {
        const document_uri = get_document_uri('signature_help_struct_0.hltxt');
        await test_signature_help(document_uri, new vscode.Position(14, 31), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show struct signature 1", async () => {
        const document_uri = get_document_uri('signature_help_struct_1.hltxt');
        await test_signature_help(document_uri, new vscode.Position(15, 21), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show struct signature 2", async () => {
        const document_uri = get_document_uri('signature_help_struct_2.hltxt');
        await test_signature_help(document_uri, new vscode.Position(21, 30), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show struct signature 3", async () => {
        const document_uri = get_document_uri('signature_help_struct_3.hltxt');
        await test_signature_help(document_uri, new vscode.Position(26, 25), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show struct signature 4", async () => {
        const document_uri = get_document_uri('signature_help_struct_4.hltxt');
        await test_signature_help(document_uri, new vscode.Position(16, 19), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 0
        });
    });

    test("Should show struct signature 5", async () => {
        const document_uri = get_document_uri('signature_help_struct_5.hltxt');
        await test_signature_help(document_uri, new vscode.Position(20, 21), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show struct signature 6", async () => {
        const document_uri = get_document_uri('signature_help_struct_6.hltxt');
        await test_signature_help(document_uri, new vscode.Position(15, 21), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show struct signature 7", async () => {
        const document_uri = get_document_uri('signature_help_struct_7.hltxt');
        await test_signature_help(document_uri, new vscode.Position(18, 26), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show struct signature 8", async () => {
        const document_uri = get_document_uri('signature_help_struct_8.hltxt');
        await test_signature_help(document_uri, new vscode.Position(16, 21), {
            signatures: [create_complex_struct_signature()],
            activeSignature: 0,
            activeParameter: 1
        });
    });

    test("Should show struct signature 9", async () => {
        const document_uri = get_document_uri('signature_help_struct_9.hltxt');
        await test_signature_help(document_uri, new vscode.Position(12, 18), {
            signatures: [create_foo_struct_signature()],
            activeSignature: 0,
            activeParameter: 2
        });
    });
});

function create_complex_struct_signature(): vscode.SignatureInformation {
    return {
        label: "Complex {\n    real: Float32 = 0.0f32,\n    imaginary: Float32 = 0.0f32\n}",
        parameters: [
            {
                label: [14, 36],
                documentation: "The real part."
            },
            {
                label: [42, 69],
                documentation: "The imaginary part."
            }
        ],
        documentation: "Represents complex numbers. Uses 32-bit floats.",
        activeParameter: undefined
    };
}

function create_foo_struct_signature(): vscode.SignatureInformation {
    return {
        label: "Foo {\n    a: Float32 = 0.0f32,\n    b: Float32 = 0.0f32,\n    c: Float32 = 0.0f32\n}",
        parameters: [
            {
                label: [10, 29],
                documentation: undefined
            },
            {
                label: [35, 54],
                documentation: undefined
            },
            {
                label: [60, 79],
                documentation: undefined
            }
        ],
        documentation: undefined,
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
