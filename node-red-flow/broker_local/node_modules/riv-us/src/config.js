import fs from 'fs';


export default class Config {
  constructor(source, overrides = {}) {
    if (typeof source === 'string') {
      this.promise = loadConfigFromFile(source)
        .then((config) => resolveConfig(config, overrides));
    } else if (typeof source === 'object') {
      this.promise = Promise.resolve(resolveConfig(source, overrides));
    } else {
      this.promise = Promise.reject(new Error(`invalid configuration parameter: ${typeof source}`));
    }
  }

  load() {
    return this.promise;
  }
}


export class ResolvedConfig {
  constructor(attributes = {}, section = null) {
    this.attributes = attributes;
    this.sectionName = section;
  }

  optional(key, defaultValue) {
    let value = this.attributes[key];

    if (value !== undefined) {
      value = interpolateConfigValue(value, true);
    }

    return value === undefined ? defaultValue : value;
  }

  mandatory(key) {
    if (this.attributes[key] !== undefined) {
      return interpolateConfigValue(this.attributes[key]);
    }
    throw new Error(`missing mandatory option [${key}] in config ${this.sectionName}`);
  }

  section(key, options = { optional: false }) {
    const newSectionAttributes = this.attributes[key];
    const newSectionName = this.sectionName ? `${this.sectionName}.${key}` : key;

    if (!newSectionAttributes) {
      return options.optional ? null : new ResolvedConfig({}, newSectionName);
    }

    switch (typeof newSectionAttributes) {
      case 'object':
        return new ResolvedConfig(newSectionAttributes, newSectionName);
      case 'string':
        return interpolateSection(newSectionAttributes, newSectionName, options.optional);
      default:
        throw new Error(`config: option [${key}] should be an object`);
    }
  }
}


function loadConfigFromFile(fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf8', (err, data) => {
      if (err) {
        reject(new Error(`error reading config file: ${err.message}`));
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
}

function resolveConfig(attributes, overrides) {
  return new ResolvedConfig(Object.assign({}, attributes, overrides));
}

function interpolateConfigValue(value, optional = false) {
  if (typeof value === 'string') {
    const match  = value.match(/^\${(.+)}$/);
    if (match) {
      return interpolateConfigValue(
        interpolateExpression(match[1], optional),
        optional
      );
    }
  }

  return value;
}

function interpolateExpression(expression, optional = false) {
  const parts = expression.split('.');
  let firstPart = true;
  let value = null;

  for (const part of parts) {
    if (firstPart) {
      firstPart = false;
      value = first(part, optional);
      if (value === undefined && optional) {
        return undefined;
      }
      if (value === 'true' || value === 'false') {
        value = JSON.parse(value);
      }
    } else {
      value = next(value, part);
    }
  }

  return value;

  function first(part, optional) {
    if (!process.env[part]) {
      if (optional) {
        return undefined;
      }

      throw new Error(
        `config: cannot interpolate expression [${expression}]: ` +
        `environment variable ${part} is not set`
      );
    }

    let value = process.env[part];

    if (parts.length > 1) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        throw new Error(
          `config: cannot interpolate expression [${expression}]: ` +
          `environment variable ${part} is not a valid JSON`
        );
      }
    }

    return value;
  }

  function next(value, part) {
    if (Array.isArray(value)) {
      if (value.length !== 1) {
        throw new Error(
          `config: cannot interpolate expression [${expression}]: ` +
          `item [${part}] is an array of length ${value.length}`
        );
      }
      return next(value[0], part);

    } else if (typeof value === 'object') {
      return value[part];

    } else {
      throw new Error(
        `config: cannot interpolate expression [${expression}]: ` +
        `key path missing at ${part}`
      );
    }
  }
}

function interpolateSection(expression, sectionName, optional) {
  let attributes = interpolateConfigValue(expression, optional);

  if (attributes) {
    try {
      attributes = JSON.parse(attributes);
      if (typeof attributes !== 'object') {
        attributes = null;
      }
    } catch (e) {
      attributes = null;
    }

    if (!attributes) {
      throw new Error(
        `config: ${sectionName}: cannot interpolate expression [${expression}]: ` +
        'object expected'
      );
    }
  }

  if (attributes) {
    return new ResolvedConfig(attributes, sectionName);
  } else if (!optional) {
    return new ResolvedConfig({}, sectionName);
  } else {
    return null;
  }
}
