import * as vscode from 'vscode';
import { HDocument } from './HDocument';

export class HDocumentManager {
    private registeredDocuments = new Map<vscode.Uri, HDocument>();

    public registerDocument(documentUri: vscode.Uri, document: vscode.TextDocument): void {
        if (this.isDocumentRegistered(documentUri)) {
            return;
        }

        const hDocument = new HDocument(document);
        this.registeredDocuments.set(document.uri, hDocument);
    }

    public unregisterDocument(documentUri: vscode.Uri): void {
        this.registeredDocuments.delete(documentUri);
    }

    public isDocumentRegistered(documentUri: vscode.Uri): boolean {
        return this.registeredDocuments.has(documentUri);
    }

    public getRegisteredDocument(documentUri: vscode.Uri): HDocument {
        const document = this.registeredDocuments.get(documentUri);
        if (document === undefined) {
            throw Error("Document " + documentUri + " was not registered!");
        }
        return document;
    }
}
