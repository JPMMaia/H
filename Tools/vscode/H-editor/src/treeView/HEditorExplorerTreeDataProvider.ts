import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function pathExists(p: string): boolean {
    try {
        fs.accessSync(p);
    } catch (err) {
        return false;
    }
    return true;
}

function getFileContentAsJson(filePath: string): any | undefined {

    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString();
    if (text.length === 0) {
        return undefined;
    }

    const json = JSON.parse(text);
    return json;
}

function getEntriesInDirectory(extensionUri: vscode.Uri, directoryPath: string): Entry[] {

    if (!pathExists(directoryPath)) {
        return [];
    }

    const directory = fs.opendirSync(directoryPath);

    let entries: Entry[] = [];

    {
        let directoryEntry = directory.readSync();

        while (directoryEntry !== null) {

            if (directoryEntry.isFile()) {
                if (directoryEntry.name.endsWith(".hl")) {

                    const entryPath = path.join(directoryPath, directoryEntry.name);

                    const entry = new Entry(
                        directoryEntry.name,
                        "hl_module",
                        entryPath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-namespace.svg')
                    );

                    entries.push(entry);
                }
            }
            else if (directoryEntry.isDirectory()) {

                const entryPath = path.join(directoryPath, directoryEntry.name);

                const entry = new Entry(
                    directoryEntry.name,
                    "directory",
                    entryPath,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'folder.svg')
                );

                entries.push(entry);
            }

            directoryEntry = directory.readSync();
        }
    }

    return entries;
}

function getEntriesInModule(extensionUri: vscode.Uri, entryPath: string): Entry[] {

    const dependenciesEntry = new Entry(
        "dependencies",
        "hl_module_dependencies",
        entryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined
    );

    const declarationsEntry = new Entry(
        "content",
        "hl_module_content",
        entryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined
    );

    return [
        dependenciesEntry,
        declarationsEntry
    ];
}

function createEntriesFromDeclarations(extensionUri: vscode.Uri, declarations: any): Entry[] {

    const aliasEntries: Entry[] = declarations.alias_type_declarations.elements.map(
        (declaration: any) => {
            return new Entry(
                declaration.name,
                "alias_type_declaration",
                "",
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-parameter.svg')
            );
        }
    );

    const enumEntries = declarations.enum_declarations.elements.map(
        (declaration: any) => {
            return new Entry(
                declaration.name,
                "enum_declaration",
                "",
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-enum.svg')
            );
        }
    );

    const structEntries = declarations.struct_declarations.elements.map(
        (declaration: any) => {
            return new Entry(
                declaration.name,
                "struct_declaration",
                "",
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-structure.svg')
            );
        }
    );

    const functionEntries = declarations.function_declarations.elements.map(
        (declaration: any) => {
            return new Entry(
                declaration.name,
                "function_declaration",
                "",
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-method.svg')
            );
        }
    );


    return [
        ...aliasEntries,
        ...enumEntries,
        ...structEntries,
        ...functionEntries
    ];
}

function getContentEntries(extensionUri: vscode.Uri, entryPath: string): Entry[] {

    const json = getFileContentAsJson(entryPath);

    if (json === undefined) {
        return [];
    }

    return [
        ...createEntriesFromDeclarations(extensionUri, json.export_declarations),
        ...createEntriesFromDeclarations(extensionUri, json.internal_declarations)
    ];
}

export class HEditorExplorerTreeDataProvider implements vscode.TreeDataProvider<Entry> {

    constructor(private workspaceRoot: string, private extensionUri: vscode.Uri) { }

    getTreeItem(element: Entry): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Entry): Thenable<Entry[]> {

        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No entries in empty workspace');
            return Promise.resolve([]);
        }

        if (element) {

            if (element.contextValue === "directory") {
                const entries = getEntriesInDirectory(this.extensionUri, element.entryPath);
                return Promise.resolve(entries);
            }
            else if (element.contextValue === "hl_module") {
                const entries = getEntriesInModule(this.extensionUri, element.entryPath);
                return Promise.resolve(entries);
            }
            else if (element.contextValue === "hl_module_content") {
                const entries = getContentEntries(this.extensionUri, element.entryPath);
                return Promise.resolve(entries);
            }
            else {
                return Promise.resolve([]);
            }

        } else {
            const entries = getEntriesInDirectory(this.extensionUri, this.workspaceRoot);
            return Promise.resolve(entries);
        }
    }
}

class Entry extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        contextValue: string,
        public readonly entryPath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        iconPath: vscode.Uri | undefined
    ) {
        super(label, collapsibleState);

        this.contextValue = contextValue;
        this.iconPath = iconPath;
    }
}
