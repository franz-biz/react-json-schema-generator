# JSON Schema Generator

A React component for generating JSON schemas visually.

![JSON Schema Generator Screenshot](https://github.com/franz-biz/react-json-schema-generator/blob/main/screenshot.png?raw=true)

## Installation

```bash
npm install @usefranz/react-json-schema-generator
```

or

```bash
yarn add  @usefranz/react-json-schema-generator
```

## Usage

```jsx
import React from 'react';
import { JSONSchemaGenerator } from 'react-json-schema-generator';

const App = () => {
  return (
    <div>
      <h1>My JSON Schema Generator</h1>
      <JSONSchemaGenerator />
    </div>
  );
};

export default App;
```

## Features

- Visual interface for creating JSON schemas
- Support for nested objects and arrays
- Import existing JSON or JSON schemas
- Live preview of the generated schema

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.