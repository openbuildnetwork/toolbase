import { GeneratorOptions, Language } from "@/app/(tools)/json-to-interface/types/json-to-interface-types";
export function generateModels(json: unknown, options: GeneratorOptions): string {
    const { rootName, language, usePydantic = false } = options;
    const models: Map<string, string> = new Map();
    const processedObjects = new Map<string, unknown>();

    const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const camelCase = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
    const snakeCase = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');

    function processValue(name: string, value: unknown): string {
        if (value === null) {
            switch (language) {
                case 'typescript': return 'any';
                case 'python': return 'Optional[Any]';
                case 'dart': return 'dynamic';
                case 'java': return 'Object';
                case 'kotlin': return 'Any?';
                case 'swift': return 'Any?';
                case 'go': return 'interface{}';
                default: return 'any';
            }
        }

        if (Array.isArray(value)) {
            const itemType = value.length > 0 ? processValue(name + 'Item', value[0]) : 'any';
            return getArrayType(itemType, language);
        }

        if (typeof value === 'object' && value !== null) {
            let className = capitalized(camelCase(name));

            let counter = 1;
            const originalClassName = className;
            while (models.has(className) && JSON.stringify(processedObjects.get(className)) !== JSON.stringify(value)) {
                className = `${originalClassName}${counter++}`;
            }

            if (!models.has(className)) {
                processedObjects.set(className, value);
                const modelContent = generateModelContent(className, value as Record<string, unknown>, language, usePydantic);
                models.set(className, modelContent);
            }
            return className;
        }
        return getBaseType(value, language);
    }

    function getArrayType(itemType: string, lang: Language): string {
        switch (lang) {
            case 'typescript': return `${itemType}[]`;
            case 'python': return `List[${itemType}]`;
            case 'dart': return `List<${itemType}>`;
            case 'java': return `List<${itemType}>`;
            case 'kotlin': return `List<${itemType}>`;
            case 'swift': return `[${itemType}]`;
            case 'go': return `[]${itemType}`;
            default: return `${itemType}[]`;
        }
    }

    function getBaseType(val: unknown, lang: Language): string {
        const type = typeof val;
        if (val === null) return 'any';

        if (type === 'number') {
            if (Number.isInteger(val)) {
                switch (lang) {
                    case 'typescript': return 'number';
                    case 'python': return 'int';
                    case 'dart': return 'int';
                    case 'java': return 'int';
                    case 'kotlin': return 'Int';
                    case 'swift': return 'Int';
                    case 'go': return 'int';
                }
            }
            switch (lang) {
                case 'typescript': return 'number';
                case 'python': return 'float';
                case 'dart': return 'double';
                case 'java': return 'double';
                case 'kotlin': return 'Double';
                case 'swift': return 'Double';
                case 'go': return 'float64';
            }
        }
        if (type === 'boolean') {
            switch (lang) {
                case 'typescript': return 'boolean';
                case 'python': return 'bool';
                case 'dart': return 'bool';
                case 'java': return 'boolean';
                case 'kotlin': return 'Boolean';
                case 'swift': return 'Bool';
                case 'go': return 'bool';
            }
        }
        if (type === 'string') {
            switch (lang) {
                case 'typescript': return 'string';
                case 'python': return 'str';
                case 'dart': return 'String';
                case 'java': return 'String';
                case 'kotlin': return 'String';
                case 'swift': return 'String';
                case 'go': return 'string';
            }
        }
        return 'any';
    }

    function generateModelContent(name: string, obj: Record<string, unknown>, lang: Language, pydantic: boolean): string {
        const keys = Object.keys(obj);
        let content = '';

        switch (lang) {
            case 'typescript':
                content = `export interface ${name} {\n`;
                keys.forEach(key => {
                    const value = obj[key];
                    content += `    ${key}${value === null ? '?' : ''}: ${processValue(key, value)};\n`;
                });
                content += `}`;
                break;

            case 'python':
                if (pydantic) {
                    content = `class ${name}(BaseModel):\n`;
                    if (keys.length === 0) content += `    pass\n`;
                    keys.forEach(key => {
                        const value = obj[key];
                        content += `    ${snakeCase(key)}: ${processValue(key, value)}\n`;
                    });
                } else {
                    content = `@dataclass\nclass ${name}:\n`;
                    if (keys.length === 0) content += `    pass\n`;
                    keys.forEach(key => {
                        const value = obj[key];
                        content += `    ${snakeCase(key)}: ${processValue(key, value)}\n`;
                    });
                }
                break;

            case 'dart':
                content = `class ${name} {\n`;
                keys.forEach(key => {
                    content += `  final ${processValue(key, obj[key])} ${key};\n`;
                });
                content += `\n  ${name}({\n`;
                keys.forEach(key => content += `    required this.${key},\n`);
                content += `  });\n}`;
                break;

            case 'java':
                content = `public class ${name} {\n`;
                keys.forEach(key => {
                    content += `    public ${processValue(key, obj[key])} ${key};\n`;
                });
                content += `}`;
                break;

            case 'kotlin':
                content = `data class ${name}(\n`;
                keys.forEach((key, i) => {
                    content += `    val ${key}: ${processValue(key, obj[key])}${i === keys.length - 1 ? '' : ','}\n`;
                });
                content += `)`;
                break;

            case 'swift':
                content = `struct ${name}: Codable {\n`;
                keys.forEach(key => {
                    content += `    let ${key}: ${processValue(key, obj[key])}\n`;
                });
                content += `}`;
                break;

            case 'go':
                content = `type ${name} struct {\n`;
                keys.forEach(key => {
                    content += `    ${capitalized(key)} ${processValue(key, obj[key])} \`json:"${key}"\`\n`;
                });
                content += `}`;
                break;
        }

        return content;
    }

    processValue(rootName, json);

    const imports = {
        python: usePydantic
            ? 'from __future__ import annotations\nfrom pydantic import BaseModel\nfrom typing import List, Optional, Any\n\n'
            : 'from __future__ import annotations\nfrom dataclasses import dataclass\nfrom typing import List, Optional, Any\n\n',
        java: 'import java.util.List;\n\n',
        go: '',
        swift: 'import Foundation\n\n',
        dart: '',
        kotlin: '',
        typescript: ''
    };

    let finalOutput = imports[language] || '';

    const rootClassName = capitalized(camelCase(rootName));
    const rootModel = models.get(rootClassName);
    if (rootModel) {
        finalOutput += rootModel + '\n\n';
        models.delete(rootClassName);
    }

    Array.from(models.keys()).sort().forEach((key) => {
        finalOutput += models.get(key) + '\n\n';
    });

    return finalOutput.trim();
}
