import * as vscode from 'vscode';
import * as fs from 'fs';
import { HDocumentManager } from '../HDocumentManager';
import * as core from '../utilities/coreModelInterface';

function pathExists(p: string): boolean {
    try {
        fs.accessSync(p);
    } catch (err) {
        return false;
    }
    return true;
}

function getDocumentContentAsJson(hDocumentManager: HDocumentManager, documentUri: vscode.Uri): Thenable<core.Module> {

    if (hDocumentManager.isDocumentRegistered(documentUri)) {
        const hDocument = hDocumentManager.getRegisteredDocument(documentUri);
        return Promise.resolve(hDocument.getState());
    }

    return vscode.workspace.openTextDocument(documentUri).then(
        (document): core.Module => {
            hDocumentManager.registerDocument(document.uri, document);
            const hDocument = hDocumentManager.getRegisteredDocument(document.uri);
            return hDocument.getState();
        }
    );
}

function getEntriesInDirectory(extensionUri: vscode.Uri, directoryUri: vscode.Uri): HEditorExplorerTreeEntry[] {

    if (!pathExists(directoryUri.fsPath)) {
        return [];
    }

    const directory = fs.opendirSync(directoryUri.fsPath);

    let entries: HEditorExplorerTreeEntry[] = [];

    {
        let directoryEntry = directory.readSync();

        while (directoryEntry !== null) {

            if (directoryEntry.isFile()) {
                if (directoryEntry.name.endsWith(".hl")) {

                    const entryUri = vscode.Uri.joinPath(directoryUri, directoryEntry.name);

                    const entry = new HEditorExplorerTreeEntry(
                        directoryEntry.name,
                        "hl_module",
                        entryUri,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-namespace.svg')
                    );

                    entries.push(entry);
                }
            }
            else if (directoryEntry.isDirectory()) {

                const entryUri = vscode.Uri.joinPath(directoryUri, directoryEntry.name);

                const entry = new HEditorExplorerTreeEntry(
                    directoryEntry.name,
                    "directory",
                    entryUri,
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

function getEntriesInModule(extensionUri: vscode.Uri, entryUri: vscode.Uri): HEditorExplorerTreeEntry[] {

    const dependenciesEntry = new HEditorExplorerTreeEntry(
        "dependencies",
        "hl_module_dependencies",
        entryUri,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined
    );

    const declarationsEntry = new HEditorExplorerTreeEntry(
        "content",
        "hl_module_content",
        entryUri,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined
    );

    return [
        dependenciesEntry,
        declarationsEntry
    ];
}

function createEntriesFromDeclarations(extensionUri: vscode.Uri, declarations: core.Module_declarations): HEditorExplorerTreeEntry[] {

    const aliasEntries: HEditorExplorerTreeEntry[] = declarations.alias_type_declarations.elements.map(
        (declaration: core.Alias_type_declaration) => {
            return new HEditorExplorerTreeEntry(
                declaration.name,
                "alias_type_declaration",
                vscode.Uri.file(""),
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-parameter.svg'),
                declaration.id
            );
        }
    );

    const enumEntries = declarations.enum_declarations.elements.map(
        (declaration: core.Enum_declaration) => {
            return new HEditorExplorerTreeEntry(
                declaration.name,
                "enum_declaration",
                vscode.Uri.file(""),
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-enum.svg'),
                declaration.id
            );
        }
    );

    const structEntries = declarations.struct_declarations.elements.map(
        (declaration: core.Struct_declaration) => {
            return new HEditorExplorerTreeEntry(
                declaration.name,
                "struct_declaration",
                vscode.Uri.file(""),
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-structure.svg'),
                declaration.id
            );
        }
    );

    const functionEntries = declarations.function_declarations.elements.map(
        (declaration: core.Function_declaration) => {
            return new HEditorExplorerTreeEntry(
                declaration.name,
                "function_declaration",
                vscode.Uri.file(""),
                vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'src', 'icons', 'symbol-method.svg'),
                declaration.id
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

function getContentEntries(hDocumentManager: HDocumentManager, extensionUri: vscode.Uri, entryUri: vscode.Uri): Thenable<HEditorExplorerTreeEntry[]> {

    return getDocumentContentAsJson(hDocumentManager, entryUri).then(
        (json) => {
            return [
                ...createEntriesFromDeclarations(extensionUri, json.export_declarations),
                ...createEntriesFromDeclarations(extensionUri, json.internal_declarations)
            ];
        }
    );
}

function getUriFirstPart(firstUri: vscode.Uri, secondUri: vscode.Uri): string {
    const uriWithoutParent = secondUri.path.slice(firstUri.path.length + 1);

    const indexOfSlash = uriWithoutParent.indexOf('/');
    if (indexOfSlash === -1) {
        return uriWithoutParent;
    }

    const uriFirstPart = uriWithoutParent.slice(0, indexOfSlash);
    return uriFirstPart;
}

export class HEditorExplorerTreeDataProvider implements vscode.TreeDataProvider<HEditorExplorerTreeEntry> {

    private _onDidChangeTreeData: vscode.EventEmitter<HEditorExplorerTreeEntry | undefined | null | void> = new vscode.EventEmitter<HEditorExplorerTreeEntry | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HEditorExplorerTreeEntry | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private workspaceRootUri: vscode.Uri,
        private extensionUri: vscode.Uri,
        private hDocumentManager: HDocumentManager
    ) { }

    getTreeItem(element: HEditorExplorerTreeEntry): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HEditorExplorerTreeEntry): Thenable<HEditorExplorerTreeEntry[]> {

        if (!this.workspaceRootUri.fsPath) {
            vscode.window.showInformationMessage('No entries in empty workspace');
            return Promise.resolve([]);
        }

        if (element) {

            if (element.contextValue === "directory") {
                const entries = getEntriesInDirectory(this.extensionUri, element.entryUri);
                return Promise.resolve(entries);
            }
            else if (element.contextValue === "hl_module") {
                const entries = getEntriesInModule(this.extensionUri, element.entryUri);
                return Promise.resolve(entries);
            }
            else if (element.contextValue === "hl_module_content") {
                const entriesPromise = getContentEntries(
                    this.hDocumentManager,
                    this.extensionUri,
                    element.entryUri
                );

                return entriesPromise;
            }
            else {
                return Promise.resolve([]);
            }

        } else {
            const entries = getEntriesInDirectory(this.extensionUri, this.workspaceRootUri);
            return Promise.resolve(entries);
        }
    }



    private getEntryWithUri(workspaceRootUri: vscode.Uri, parent: HEditorExplorerTreeEntry | undefined, uri: vscode.Uri): Thenable<HEditorExplorerTreeEntry | undefined> {

        const uriFirstPart = getUriFirstPart(parent === undefined ? workspaceRootUri : parent.entryUri, uri);

        return this.getChildren(parent).then(
            children => {
                for (const child of children) {

                    const childLastPart = child.entryUri.path.slice(child.entryUri.path.lastIndexOf('/') + 1);

                    if (uriFirstPart === childLastPart) {

                        if (child.entryUri.path === uri.path) {
                            return Promise.resolve(child);
                        }
                        else {
                            return this.getEntryWithUri(workspaceRootUri, child, uri);
                        }
                    }
                }

                return Promise.resolve(undefined);
            }
        );
    }

    public refresh(documentUri: vscode.Uri): void {

        this._onDidChangeTreeData.fire();

        // TODO for some reason, passing the entry as argument doesn't update the tree
        /*this.getEntryWithUri(this.workspaceRootUri, undefined, documentUri).then(
            entry => {
                this._onDidChangeTreeData.fire(entry);
            }
        );*/
    }
}

export class HEditorExplorerTreeEntry extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        contextValue: string,
        public readonly entryUri: vscode.Uri,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        iconPath: vscode.Uri | undefined,
        public readonly hID?: number
    ) {
        super(label, collapsibleState);

        this.contextValue = contextValue;
        this.iconPath = iconPath;
    }
}
