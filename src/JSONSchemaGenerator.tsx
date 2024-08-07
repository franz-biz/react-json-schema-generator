import React, { useState } from 'react';
import './JSONSchemaGenerator.css';

interface SchemaProperty {
    name: string;
    type: string;
    description?: string;
    required: boolean;
    enum?: string[];
    items?: SchemaProperty;
    properties?: SchemaProperty[];
}

const initialSchema: SchemaProperty = {
    name: 'root',
    type: 'object',
    properties: [],
    required: false,
};

export const JSONSchemaGenerator: React.FC = () => {
    const [schema, setSchema] = useState<SchemaProperty>(initialSchema);
    const [currentProperty, setCurrentProperty] = useState<SchemaProperty>({
        name: '',
        type: 'string',
        description: '',
        required: false,
    });
    const [showJsonPreview, setShowJsonPreview] = useState(true);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importedText, setImportedText] = useState<string>('');
    const [currentPath, setCurrentPath] = useState<string[]>(['root']);

    const getCurrentProperties = (): SchemaProperty[] => {
        let current: SchemaProperty = schema;
        for (const path of currentPath.slice(1)) {
            if (current.type === 'object' && current.properties) {
                current = current.properties.find((p) => p.name === path) || current;
            } else if (current.type === 'array' && current.items) {
                current = current.items;
            }
        }

        if (current.type === 'object') {
            return current.properties || [];
        }
        if (current.type === 'array' && current.items && current.items.type === 'object') {
            return current.items.properties || [];
        }

        return [];
    };

    const setCurrentProperties = (newProperties: SchemaProperty[]) => {
        const updateProperties = (obj: SchemaProperty, path: string[]): SchemaProperty => {
            if (path.length === 0) {
                if (obj.type === 'object') {
                    return { ...obj, properties: newProperties };
                }
                if (obj.type === 'array' && obj.items && obj.items.type === 'object') {
                    return { ...obj, items: { ...obj.items, properties: newProperties } };
                }
                return obj;
            }
            const [current, ...rest] = path;
            if (obj.type === 'object' && obj.properties) {
                return {
                    ...obj,
                    properties: obj.properties.map((p) => (p.name === current ? updateProperties(p, rest) : p)),
                };
            }
            if (obj.type === 'array' && obj.items) {
                return {
                    ...obj,
                    items: updateProperties(obj.items, rest),
                };
            }
            return obj;
        };

        setSchema(updateProperties(schema, currentPath.slice(1)));
    };

    const handleAddProperty = () => {
        if (currentProperty.name) {
            const newProperty = { ...currentProperty };
            if (newProperty.type === 'array') {
                newProperty.items = { type: 'string', name: 'item', required: false };
            }
            const properties = getCurrentProperties();
            setCurrentProperties([...properties, newProperty]);
            setCurrentProperty({ name: '', type: 'string', description: '', required: false });
        }
    };

    const handleRemoveProperty = (index: number) => {
        const properties = getCurrentProperties();
        setCurrentProperties(properties.filter((_, i) => i !== index));
    };

    const handleImport = (isJsonSchema: boolean) => {
        try {
            const importedData = JSON.parse(importedText);
            const convertedSchema = isJsonSchema
                ? convertJsonSchemaToInternal(importedData)
                : convertJsonToJsonSchema(importedData);
            setSchema(convertedSchema);
            setCurrentPath(['root']);
            setImportModalOpen(false);
            setImportedText('');
        } catch (error) {
            alert("Error parsing JSON. Please ensure it's valid.");
        }
    };

    const convertJsonSchemaToInternal = (jsonSchema: any, name: string = 'root'): SchemaProperty => {
        const internalSchema: SchemaProperty = {
            name,
            type: jsonSchema.type,
            required: jsonSchema.required ? jsonSchema.required.includes(name) : false,
            description: jsonSchema.description,
        };

        if (jsonSchema.properties) {
            internalSchema.properties = Object.entries(jsonSchema.properties).map(([key, value]) =>
                convertJsonSchemaToInternal(value as any, key)
            );
        }

        if (jsonSchema.items) {
            internalSchema.items = convertJsonSchemaToInternal(jsonSchema.items, 'items');
        }

        if (jsonSchema.enum) {
            internalSchema.enum = jsonSchema.enum;
        }

        return internalSchema;
    };

    const convertJsonToJsonSchema = (json: any, name: string = 'root'): SchemaProperty => {
        const getType = (value: any): string => {
            if (Array.isArray(value)) return 'array';
            if (value === null) return 'null';
            return typeof value;
        };

        const schema: SchemaProperty = {
            name,
            type: getType(json),
            required: false,
        };

        if (schema.type === 'object') {
            schema.properties = Object.entries(json).map(([key, value]) => convertJsonToJsonSchema(value, key));
        } else if (schema.type === 'array' && json.length > 0) {
            schema.items = convertJsonToJsonSchema(json[0], 'items');
        }

        return schema;
    };

    const generateSchema = () => {
        const schemaOutput: any = {
            type: 'object',
            properties: {}
        };

        const addPropertiesToSchema = (properties: SchemaProperty[], parentSchema: any) => {
            properties.forEach(prop => {
                parentSchema[prop.name] = {
                    type: prop.type,
                    description: prop.description
                };
                if (prop.required) {
                    if (!parentSchema.required) parentSchema.required = [];
                    parentSchema.required.push(prop.name);
                }
                if (prop.type === 'object' && prop.properties) {
                    parentSchema[prop.name].properties = {};
                    addPropertiesToSchema(prop.properties, parentSchema[prop.name]);
                }
                if (prop.type === 'array' && prop.items) {
                    parentSchema[prop.name].items = {
                        type: prop.items.type
                    };
                    if (prop.items.type === 'object' && prop.items.properties) {
                        parentSchema[prop.name].items.properties = {};
                        addPropertiesToSchema(prop.items.properties, parentSchema[prop.name].items);
                    }
                }
            });
        };

        addPropertiesToSchema(schema.properties || [], schemaOutput);

        return JSON.stringify(schemaOutput, null, 2);
    };

    const renderBreadcrumbs = () => (
        <div className="breadcrumbs">
            {currentPath.map((path, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <span className="separator">&gt;</span>}
                    <a onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}>{path}</a>
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="json-schema-generator">
            <div className="header">
                <h1>JSON Schema Generator</h1>
                <button onClick={() => setImportModalOpen(true)} className="import-button">
                    Import
                </button>
            </div>
            <p className="description">Create a JSON schema by adding properties and their details.</p>

            {renderBreadcrumbs()}

            <div className="property-input">
                <input
                    type="text"
                    placeholder="Enter property name"
                    value={currentProperty.name}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, name: e.target.value })}
                />
                <select
                    value={currentProperty.type}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, type: e.target.value })}
                >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="object">object</option>
                    <option value="array">array</option>
                </select>
                <div className="required-checkbox">
                    <input
                        type="checkbox"
                        id="required"
                        checked={currentProperty.required}
                        onChange={(e) => setCurrentProperty({ ...currentProperty, required: e.target.checked })}
                    />
                    <label htmlFor="required">Required</label>
                </div>
                <button onClick={handleAddProperty} className="add-button">
                    Add
                </button>
            </div>

            <table className="properties-table">
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {getCurrentProperties().map((prop, index) => (
                    <tr key={index}>
                        <td>{prop.name}</td>
                        <td>{prop.type}</td>
                        <td>{prop.required ? '✓' : ''}</td>
                        <td>
                            <div className="actions">
                                <button onClick={() => handleRemoveProperty(index)} className="remove-button">
                                    Remove
                                </button>
                                {(prop.type === 'object' || (prop.type === 'array' && prop.items?.type === 'object')) && (
                                    <button
                                        onClick={() => {
                                            setCurrentPath((prevPath) => {
                                                if (prop.type === 'array') {
                                                    return [...prevPath, prop.name, 'items'];
                                                }
                                                return [...prevPath, prop.name];
                                            });
                                        }}
                                        className="navigate-button"
                                    >
                                        Navigate
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            <button
                onClick={() => setShowJsonPreview(!showJsonPreview)}
                className="toggle-preview-button"
            >
                {showJsonPreview ? 'Hide JSON Preview' : 'Show JSON Preview'}
            </button>

            {showJsonPreview && (
                <pre className="json-preview">
          {generateSchema()}
        </pre>
            )}

            {importModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Import JSON or JSON Schema</h3>
                        <textarea
                            placeholder="Paste your JSON or JSON Schema here"
                            value={importedText}
                            onChange={(e) => setImportedText(e.target.value)}
                        />
                        <div className="modal-buttons">
                            <button onClick={() => handleImport(false)} className="import-json-button">
                                Import as JSON
                            </button>
                            <button onClick={() => handleImport(true)} className="import-schema-button">
                                Import as JSON Schema
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JSONSchemaGenerator;