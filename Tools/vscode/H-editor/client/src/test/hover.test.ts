import * as vscode from 'vscode';
import * as assert from 'assert';
import { get_document_uri, activate } from './helper';

suite("Should get hover of structs", () => {

    test("Gets struct hover at itself", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(3, 7), [
            new vscode.Hover([create_complex_struct_markdown_string()], to_range(3, 7, 3, 14))
        ]);
    });

    test("Gets struct hover at input parameter type", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(12, 20), [
            new vscode.Hover([create_complex_struct_markdown_string()], to_range(12, 20, 12, 27))
        ]);
    });

    test("Gets struct hover at output parameter type", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(12, 41), [
            new vscode.Hover([create_complex_struct_markdown_string()], to_range(12, 41, 12, 48))
        ]);
    });

    test("Gets struct hover at variable type", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(14, 18), [
            new vscode.Hover([create_complex_struct_markdown_string()], to_range(14, 18, 14, 25))
        ]);
    });

    test("Gets struct member hover at instantiate struct member 0", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(15, 8), [
            new vscode.Hover([create_complex_struct_real_markdown_string()], to_range(15, 8, 15, 12))
        ]);
    });

    test("Gets struct member hover at instantiate struct member 1", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(16, 8), [
            new vscode.Hover([create_complex_struct_imaginary_markdown_string()], to_range(16, 8, 16, 17))
        ]);
    });

    test("Gets struct member hover at access expression 0", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(18, 24), [
            new vscode.Hover([create_complex_struct_real_markdown_string()], to_range(18, 24, 18, 28))
        ]);
    });

    test("Gets struct member hover at access expression 1", async () => {
        const document_uri = get_document_uri("hover_struct_0.hltxt");
        await test_hover(document_uri, new vscode.Position(19, 29), [
            new vscode.Hover([create_complex_struct_imaginary_markdown_string()], to_range(19, 29, 19, 38))
        ]);
    });
});

function create_complex_struct_markdown_string(): vscode.MarkdownString {
    return new vscode.MarkdownString(
        [
            '```hlang',
            'module hover_struct_0',
            'struct Complex',
            '```',
            'Represents complex numbers. Uses 32-bit floats.'
        ].join('\n')
    );
}

function create_complex_struct_real_markdown_string(): vscode.MarkdownString {
    return new vscode.MarkdownString(
        [
            '```hlang',
            'Complex.real: Float32 = 0.0f32',
            '```',
            'The real part.'
        ].join('\n')
    );
}

function create_complex_struct_imaginary_markdown_string(): vscode.MarkdownString {
    return new vscode.MarkdownString(
        [
            '```hlang',
            'Complex.imaginary: Float32 = 0.0f32',
            '```',
            'The imaginary part.'
        ].join('\n')
    );
}

suite("Should get hover of functions", () => {

    test("Gets function hover at itself", async () => {
        const document_uri = get_document_uri("hover_function_0.hltxt");
        await test_hover(document_uri, new vscode.Position(10, 9), [
            new vscode.Hover([create_add_function_markdown_string()], to_range(10, 9, 10, 12))
        ]);
    });

    test("Gets function hover at expression call", async () => {
        const document_uri = get_document_uri("hover_function_0.hltxt");
        await test_hover(document_uri, new vscode.Position(17, 17), [
            new vscode.Hover([create_add_function_markdown_string()], to_range(17, 17, 17, 20))
        ]);
    });
});

function create_add_function_markdown_string(): vscode.MarkdownString {
    return new vscode.MarkdownString(
        [
            '```hlang',
            'module hover_function_0',
            'function add(lhs: Int32, rhs: Int32) -> (result: Int32)',
            '```',
            'Add two integers',
            '',
            'Add two 32-bit integers.',
            'It returns the result of adding lhs and rhs.',
        ].join('\n')
    );
}

function to_range(start_line: number, start_character: number, end_line: number, end_character: number): vscode.Range {
    const start = new vscode.Position(start_line, start_character);
    const end = new vscode.Position(end_line, end_character);
    return new vscode.Range(start, end);
}

async function test_hover(document_uri: vscode.Uri, position: vscode.Position, expected_hovers: vscode.Hover[]) {
    await activate(document_uri);

    const actual_hovers = (await vscode.commands.executeCommand(
        'vscode.executeHoverProvider',
        document_uri,
        position
    )) as vscode.Hover[];

    assert.equal(actual_hovers.length, expected_hovers.length);

    expected_hovers.forEach((expected_hover, i) => {
        const actual_hover = actual_hovers[i];

        const expected_contents = expected_hover.contents as vscode.MarkdownString[];
        const actual_contents = actual_hover.contents as vscode.MarkdownString[];

        assert.equal(actual_contents.length, expected_contents.length);

        for (let index = 0; index < actual_contents.length; ++index) {
            const actual_content = actual_contents[index];
            const expected_content = expected_contents[index];

            assert.equal(actual_content.value, expected_content.value);
        }

        assert.deepEqual(actual_hover.range, expected_hover.range);
    });
}