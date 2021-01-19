class ColumnParser {
  constructor() {
    this.metas = [
      'type', 'name', 'autoincrement', 'nullable', 'default', 'comment',
    ];
    const mappings = {
      string: ['varchar', 'text', 'string', 'char', 'enum', 'tinytext', 'mediumtext', 'longtext'],
      date: ['datetime', 'year', 'date', 'time', 'timestamp'],
      int: ['bigint', 'int', 'integer', 'tinyint', 'smallint', 'mediumint'],
      float: ['float', 'decimal', 'numeric', 'dec', 'fixed', 'double', 'real', 'double precision'],
      boolean: ['longblob', 'blob', 'bit'],
    };
    this.mappings = {};
    for (const type in mappings) {
      for (const dbType of mappings[type]) {
        this.mappings[dbType] = type;
      }
    }
    const subTypes = {
      datetime: ['datetime', 'timestamp'],
      date: ['date'],
      year: ['year'],
      time: ['time'],
    };
    this.subTypes = {};
    for (const subType in subTypes) {
      for (const dbSubType of subTypes[subType]) {
        this.subTypes[dbSubType] = subType;
      }
    }
  }

  parse(column) {
    const result = {
      name: column['Field'],
      nullable: column['Null'] === 'YES',
      default: column['Default'],
      comment: column['Comment'],
    };
    this.parseType(column['Type'] || 'string', result);
    this.parseAutoincrement(column['Extra'], result);

    return result;
  }

  parseAutoincrement(data, result) {
    if (data === 'auto_increment') {
      result['autoincrement'] = true;
    }
  }

  parseType(data, result) {
    const parts = /^(\w+)(?:\(([^\)]+)\))?/.exec(data);
    let dbType = parts[1].toLowerCase();

    result['type'] = this.mappings[dbType] || dbType;
    if (this.subTypes[dbType]) {
      result['subType'] = this.subTypes[dbType];
    }

    if (parts[2]) {
      this.parsePrecision(dbType, parts[2], result);
    }

    if (result['type'] === 'int') {
      result['unsigned'] = dbType.includes('unsigned');
    }
  }

  parsePrecision(dbType, data, result) {
    const precision = data.replace(/'/g, '').split(',');

    if (dbType === 'enum') {
      result['enum'] = precision;

      return;
    }

    const size = parseInt(precision[0]);

    const boolTypes = {
      bit: true,
      tinyint: true,
    };

    if (size === 1 && boolTypes[dbType]) {
      result['type'] = 'bool';

      return;
    }

    result['size'] = size;

    if (precision[1]) {
      result['scale'] = parseInt(precision[1]);
    }
  }


}

exports.ColumnParser = ColumnParser;