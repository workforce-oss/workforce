import * as vscode from 'vscode';

export class CodeFactsApi {
    // Get all of the files in the project using the vscode.workspace API
    // https://code.visualstudio.com/api/references/vscode-api#workspace

    private static _standardExcludedPaths: string[] = [
        // 'reference',
        'node_modules/',
        'dist/',
        'out/',
        'build/',
        'bin/',
        // 'obj/',
        'coverage/',
        'test-results/',
        'target/',
        'tmp/',
        'temp/',
        'temp-',
        'tmp-',
        'temp_',
        'tmp_',
        '__pycache__',
        '.git',
        '.svn',
        '.hg',
        '.mvn',
        '.vscode',
        '.vs',
        '.idea',
        '.vscode-test',
        '.history',
        '.DS_Store',
        '.gitignore',
        '.gitattributes',
        '.gitmodules',
        '.gitkeep',
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.svg',
        '.ico',
        '.eot',
        '.ttf',
        '.woff',
        '.woff2',
        '.otf',
        '.mp3',
        '.mp4',
        '.wav',
        '.avi',
        '.mov',
        '.wmv',
        '.flv',
        '.mkv',
        '.zip',
        '.tar',
        '.gz',
        '.rar',
        '.7z',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.pdf',
        '.exe',
        '.dll',
        '.so',
        '.deb',
        '.rpm',
        '.jar',
        '.war',
        '.ear',
        '.json',
        '.test',
        '.d.ts',
    ];




    public static async getFiles(excludedPaths: string[], baseUrl: string, channel?: vscode.OutputChannel, overrideStandardIgnoreList?: boolean): Promise<string[]> {
        let files: string[] = [];
        console.log('Getting files for current project...');

        let uris = await vscode.workspace.findFiles(new vscode.RelativePattern(baseUrl, '**/*'), "**/node_modules/**");
        channel?.appendLine(`Found ${uris.length} files in the project`);
        if (excludedPaths && excludedPaths.length > 0 || this._standardExcludedPaths.length > 0) {
            uris = uris.filter(uri => {
                let path = uri.fsPath;
                for (let i = 0; i < excludedPaths.length; i++) {
                    if (path.includes(excludedPaths[i])) {
                        channel?.appendLine(`Excluding ${path} because it contains ${excludedPaths[i]}`);
                        return false;
                    }
                }
                if (!overrideStandardIgnoreList) {
                    for (let i = 0; i < this._standardExcludedPaths.length; i++) {
                        if (path.includes(this._standardExcludedPaths[i])) {
                            channel?.appendLine(`Excluding ${path} because it contains ${this._standardExcludedPaths[i]}`);
                            return false;
                        }
                    }
                }
                return true;
            });
        }
        channel?.appendLine(`Found ${JSON.stringify(uris, null, 2)} files in the project after filtering`);
        files = uris.map(uri_1 => uri_1.fsPath);

        return files;
    }

    public static async getImports(file: string, channel?: vscode.OutputChannel): Promise<string> {
        // literally just all of the lines that start with 'import'
        let imports: string[] = [];
        const document = await vscode.workspace.openTextDocument((file));
        for (let i = 0; i < document.lineCount; i++) {
            let line = document.lineAt(i).text;
            if (line.startsWith('import')) {
                imports.push(line);
            }
        }
        return imports.join('\n');
    }

    public static async createDocumentDetailsMap(files: {fileSystemPath: string, projectFilePath: string}[], channel?: vscode.OutputChannel): Promise<Map<string, string>> {
        let documentDetailsMap: Map<string, string> = new Map();
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            channel?.appendLine(`Getting symbols for ${file.fileSystemPath}`);
            let symbols = await this._getSymbols(file.fileSystemPath, channel);
            channel?.appendLine(`Got ${symbols.length} symbols for ${file.fileSystemPath}, symbols=${JSON.stringify(symbols, null, 2)}`);

            channel?.appendLine(`Getting details for ${file.fileSystemPath}`);
            let details = await this._getSymbolDetails(symbols, channel);
            channel?.appendLine(`Got details for ${file.fileSystemPath}`);

            let imports = await this.getImports(file.fileSystemPath, channel);
            if (imports) {
                details = imports + '\n' + details;
            }

            documentDetailsMap.set(file.projectFilePath, details);
            channel?.appendLine(`Added details for ${file}, details=${JSON.stringify(details, null, 2)}`);
        }
        return documentDetailsMap;
    }

    public static async getProblems(files: {fileSystemPath: string, projectFilePath: string}[]): Promise<Map<string, vscode.Diagnostic[]>> {
        let problems: Map<string, vscode.Diagnostic[]> = new Map();
        let diagnostics = vscode.languages.getDiagnostics();
        for (let i = 0; i < diagnostics.length; i++) {
            let diagnostic = diagnostics[i];
            if (diagnostic[1].length > 0) {
                console.log(`Got diagnostics for ${diagnostic[0].fsPath}, diagnostics=${JSON.stringify(diagnostic[1], null, 2)}`);
                const matchedFile = files.find(file => file.fileSystemPath === diagnostic[0].fsPath);
                if (matchedFile) {
                    const fileProblems = diagnostic[1].filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error);
                    if (fileProblems.length > 0) {
                        problems.set(matchedFile.projectFilePath, diagnostic[1]);
                    }
                }
            }
        }
        return problems;
    }


    // get all of the symbols for a given file using the built-in vscode API
    // https://code.visualstudio.com/api/references/commands
    static async _getSymbols(file: string, channel?: vscode.OutputChannel): Promise<[]> {
        try {
            const results = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(file));
            if (!results) {
                channel?.appendLine(`No symbols found for ${file}`);
                return [];
            }
            if (!Array.isArray(results)) {
                channel?.appendLine(`Results is not an array for ${file}, results=${JSON.stringify(results, null, 2)}`);
                return [];
            }
            return results as [];
        } catch (err) {
            channel?.appendLine(`Error getting symbols for ${file}: ${JSON.stringify(err, null, 2)}`);
            return [];
        }

    }

    static async _getSymbolDetails(symbols: [], channel?: vscode.OutputChannel): Promise<string> {
        if (!symbols) {
            return '';
        }
        let details = '';
        for (let i = 0; i < symbols.length; i++) {
            let symbol = symbols[i];
            const result = await this._getSymbolStringWithDetails(symbol, channel);
            if (result) {
                details += result + "\n";
            }
        }
        return details;
    }

    static _getDocumentSymbolStringWithDetails(symbol: vscode.DocumentSymbol, channel?: vscode.OutputChannel): string {
        let info = vscode.SymbolKind[symbol.kind] + ' ' + symbol.name;

        if (symbol.detail) {
            info += ' ' + symbol.detail;
        }
        // recurse on children
        for (let i = 0; i < symbol.children.length; i++) {
            info += '\n\t' + this._getDocumentSymbolStringWithDetails(symbol.children[i], channel);
            channel?.appendLine(`Got details for ${symbol.children[i].name}, info=${info}`);
        }
        return info;
    }

    static async getFunctionText(file: string, functionName: string, channel?: vscode.OutputChannel, symbols?: any[]): Promise<string> {
        if (!symbols) {
            symbols = await this._getSymbols(file, channel);
            channel?.appendLine(`Got symbols for ${file}, symbols=${JSON.stringify(symbols, null, 2)}`);
        }
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const symbolNameParts = symbol.name?.split('\'') as string[] | undefined;
            let matched = false;
            if (symbolNameParts && symbolNameParts.length > 1) {
                if (symbolNameParts.some(part => part === functionName)) {
                    matched = true;
                }
            } else if (symbol.name === functionName) {
                matched = true;
            }

            if (matched) {
                const document = await vscode.workspace.openTextDocument((file));
                channel?.appendLine(`Getting text for ${functionName}, ${JSON.stringify(symbol, null, 2)}`);
                return document.getText(symbol.location.range);
            } else if (symbol.children) {
                const result = await this.getFunctionText(file, functionName, channel, symbol.children).catch((e) => {
                    console.error(e);
                    return '';
                });
                if (result) {
                    return result;
                }
            }
        }
        throw new Error(`Function ${functionName} not found in ${file}`);
    }

    static async updateFunctionText(file: string, functionName: string, newText: string, symbols?: any[], channel?: vscode.OutputChannel): Promise<boolean> {
        channel?.appendLine(`Updating text for ${functionName}`);
        if (!symbols) {
            symbols = await this._getSymbols(file, channel);
        }
        channel?.appendLine(`Got symbols for ${file}, symbols=${JSON.stringify(symbols, null, 2)}`);
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            //split on single or double quote to accomodate for decorators and test functions
            const symbolNameParts = symbol.name?.split(/['"]/) as string[] | undefined;
            let matched = false;
            if (symbolNameParts && symbolNameParts.length > 1) {
                if (symbolNameParts.some(part => part === functionName)) {
                    matched = true;
                }
            } else if (symbol.name === functionName) {
                matched = true;
            }

            if (matched) {
                channel?.appendLine(`Updating text for ${functionName}, ${JSON.stringify(symbol, null, 2)}`);
                const edit = new vscode.WorkspaceEdit();
                // get the whitespace before the function name
                const document = await vscode.workspace.openTextDocument((file));
                const line = document.lineAt(symbol.location.range.start.line).text;
                let whitespace = line.substring(0, line.indexOf(symbol.name));
                // this isn't necessarily just whitespace, so lets use regex to get all the text before the first non-whitespace character
                // we will need a capture group to get the whitespace
                const match = line.match(/^(\s*)/);
                if (match) {
                    whitespace = match[0];
                }

                newText = newText.split(/\r?\n/g).map(line => whitespace + line).join('\n');
                // set the starting position to the beginning of the line
                const start = new vscode.Position(symbol.location.range.start.line, 0);
                // set the ending position to the end of the line
                const end = new vscode.Position(symbol.location.range.end.line, document.lineAt(symbol.location.range.end.line).text.length);
                const range = new vscode.Range(start, end);

                edit.replace(symbol.location.uri, range, newText);
                channel?.appendLine(`Applying edit for ${functionName}, range=${JSON.stringify(range, null, 2)}, newText=${newText}`);
                await vscode.workspace.applyEdit(edit);
                await this.formatDocument(symbol.location.uri, range);

                return true;
            } else if (symbol.children) {
                const result = await this.updateFunctionText(file, functionName, newText, symbol.children, channel).catch((e) => {
                    console.error(e);
                    return false;
                });
                if (result) {
                    return true;
                }
            }
        }

        //TODO: Think through whether this is the right behavior

        throw new Error(`Function ${functionName} not found in ${file}`);
    }

    static async formatDocument(uri: any, range?: any): Promise<void> {
        if (range) {
            const formatEdits: vscode.WorkspaceEdit[] = await vscode.commands.executeCommand('vscode.executeFormatRangeProvider', uri, range);
            if (formatEdits) {
                for (let i = 0; i < formatEdits.length; i++) {
                    const edit = formatEdits[i];
                    await vscode.workspace.applyEdit(edit);
                }
            }
        } else {
            const formatEdits: vscode.WorkspaceEdit[] = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', uri);
            if (formatEdits) {
                for (let i = 0; i < formatEdits.length; i++) {
                    const edit = formatEdits[i];
                    await vscode.workspace.applyEdit(edit);                  
                }
            }
        }
    }

    static async addFunctionText(file: string, newText: string, className?: string): Promise<void> {
        // if no classname, just append to the end of the file
        if (!className) {
            const edit = new vscode.WorkspaceEdit();
            const document = await vscode.workspace.openTextDocument((file));
            const lastLine = document.lineCount - 1;
            const lastChar = document.lineAt(lastLine).text.length;
            edit.insert(document.uri, new vscode.Position(lastLine, lastChar), '\n' + newText);
            await vscode.workspace.applyEdit(edit);
            await this.formatDocument(document.uri);
            return;
        }


        const symbols: any[] = await this._getSymbols(file);
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (className && symbol.name === className) {
                const edit = new vscode.WorkspaceEdit();
                // add to the end of the class, but before last line, and add a newline
                const lastLine = symbol.location.range.end.line - 2;
                const lastIndent = symbol.location.range.end.character;
                // prepend lastIndent + 4 spaces to each line of newText
                const spaceText = ' '.repeat(lastIndent + 4);
                const replacement = newText.split(/\r?\n/g).map(line => spaceText + line).join('\n');
                edit.insert(symbol.location.uri, new vscode.Position(lastLine, 0), replacement);
                await vscode.workspace.applyEdit(edit);
                await this.formatDocument(symbol.location.uri);
                return;
            }
        }

        throw new Error(`Class ${className} not found in ${file}`);
    }

    static async deleteFunction(file: string, functionName: string, symbols?: any[]): Promise<void> {
        if (!symbols) {
            symbols = await this._getSymbols(file);
        }
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (symbol.name === functionName) {
                const edit = new vscode.WorkspaceEdit();
                edit.delete(symbol.location.uri, symbol.location.range);
                await vscode.workspace.applyEdit(edit);
                await this.formatDocument(symbol.location.uri);
                return;
            } else if (symbol.children) {
                await this.deleteFunction(file, functionName, symbol.children).catch((e) => {
                    console.error(e);
                });
            }
        }

        throw new Error(`Function ${functionName} not found in ${file}`);
    }

    static async addPropertyText(file: string, newText: string, className?: string): Promise<void> {
        // if no classname, just append to the end of the file
        if (!className) {
            const edit = new vscode.WorkspaceEdit();
            const document = await vscode.workspace.openTextDocument((file));
            const lastLine = document.lineCount - 1;
            const lastChar = document.lineAt(lastLine).text.length;
            edit.insert(document.uri, new vscode.Position(lastLine, lastChar), '\n' + newText);
            await vscode.workspace.applyEdit(edit);
            await this.formatDocument(document.uri);
            return;
        }

        const symbols: any[] = await this._getSymbols(file);
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            let lastProperty = undefined;
            if (className && symbol.name === className) {
                // add to the beginning of the class, but after the last property
                for (let j = 0; j < symbol.children.length; j++) {
                    const child = symbol.children[j];
                    if (child.kind === vscode.SymbolKind.Property) {
                        lastProperty = child;
                    }
                }

                const edit = new vscode.WorkspaceEdit();
                if (lastProperty) {
                    // add after the last property
                    const lastLine = lastProperty.location.range.end.line;
                    const lastChar = lastProperty.location.range.end.character;
                    edit.insert(lastProperty.location.uri, new vscode.Position(lastLine, lastChar), '\n' + newText);
                } else {
                    // add to the end of the class, but before last line, and add a newline
                    const lastLine = symbol.location.range.end.line - 1;
                    const lastChar = symbol.location.range.end.character;
                    edit.insert(symbol.location.uri, new vscode.Position(lastLine, lastChar), '\n' + newText);
                }
                await vscode.workspace.applyEdit(edit);
                await this.formatDocument(symbol.location.uri);
                return;
            }
        }
    }

    static async deleteProperty(file: string, propertyName: string, symbols?: any[]): Promise<void> {
        if (!symbols) {
            symbols = await this._getSymbols(file);
        }
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (symbol.name === propertyName) {
                const edit = new vscode.WorkspaceEdit();
                edit.delete(symbol.location.uri, symbol.location.range);
                await vscode.workspace.applyEdit(edit);
                await this.formatDocument(symbol.location.uri);
                return;
            } else if (symbol.children) {
                await this.deleteProperty(file, propertyName, symbol.children);
                return;
            }
        }
    }

    // if the last character is a closing brace, loop backwards until we find the opening brace
    // otherwise, lets assume it is python and loop forward until we find the first colon
    static removeFunctionBody(text: string): string {
        let start = 0;
        let end = text.length - 1;
        let firstBraceFound = false;
        let count = 0;
        for (let i = end; i >= 0; i--) {
            if (text[i] === '}') {
                firstBraceFound = true;
                count++;
            } else if (text[i] === '{') {
                count--;
            }
            if (count === 0 && firstBraceFound) {
                start = i;
                break;
            }
        }

        if (!firstBraceFound) {
            for (let i = 0; i < text.length; i++) {
                if (text[i] === ':') {
                    start = i;
                    break;
                }
            }
        }
        return text.substring(0, start);
    }

    static async getTextFromRange(filename: string, range: vscode.Range): Promise<string> {
        // get the index of the last character on the last line
        const lastline = range.end.line;
        // read the lines of the file
        const document = await vscode.workspace.openTextDocument((filename));
        const lines = document.getText().split(/\r?\n/g);
        // now get the index of the last character on the last line
        const lastchar = lines[lastline].length;
        range = range.with({ start: range.start.with({ character: 0 }), end: range.end.with({ character: lastchar }) });
        return document.getText(range);
    }

    static async getPublicCodeString(filename: string, range: vscode.Range, symbolKind: string, removeBody: boolean): Promise<string> {
        let text = await this.getTextFromRange(filename, range);
        const trimmed = text.trimStart();

        if (trimmed.startsWith('private')) {
            return '';
        }

        if (removeBody) {
            return this.removeFunctionBody(text);
        }
        return text;
    }

    static async _getSymbolStringWithDetails(symbol: any, channel?: vscode.OutputChannel): Promise<string> {
        channel?.appendLine(`Getting details for ${symbol.name}, ${JSON.stringify(symbol, null, 2)}`);
        const kind = vscode.SymbolKind[symbol.kind];

        let info = "";
        switch (kind) {
            case 'File':
            case 'Module':
            case 'Namespace':
            case 'Package':
            case 'Class':
            case 'Interface':
                info += await this.getPublicCodeString(symbol.location.uri.path, symbol.location.range, kind, true);
                break;
            case 'Function':
            case 'Method':
            case 'Constructor':
            case 'Constant':
            case 'Variable':
                return await this.getPublicCodeString(symbol.location.uri.path, symbol.location.range, kind, true);
            case 'Property':
            case 'Field':
            case 'Enum':
            case 'String':
            case 'Number':
            case 'Boolean':
            case 'Array':
            case 'Object':
            case 'Key':
            case 'Null':
            case 'EnumMember':
            case 'Struct':
            case 'Event':
            case 'Operator':
            case 'TypeParameter':
                return await this.getPublicCodeString(symbol.location.uri.path, symbol.location.range, kind, false);
        }

        if (info === '' && kind !== 'File') {
            return info;
        }

        // recurse on children
        if (!symbol.children) {
            return info;
        }
        for (let i = 0; i < symbol.children.length; i++) {
            const childResult = await this._getSymbolStringWithDetails(symbol.children[i], channel);
            if (childResult) {
                info += '\n' + childResult;
            }
        }
        return info;
    }



}