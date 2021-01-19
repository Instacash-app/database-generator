const {ColumnParser} = require('./columnParser');

class Manager {
  constructor(configuration, excludes) {
    const mysql = require('mysql2');
    this.connection = mysql.createConnection(configuration);
    this.db = configuration.database;
    this.columnParser = new ColumnParser();
    this.excludes = {};
    this.hasManyRelations = {};
    excludes.forEach((table) => {
      this.excludes[table] = true;
    })
  }

  async scan() {
    const response = [];
    const tableResponse = await this.query(
      `SHOW FULL TABLES FROM ${this.db} WHERE Table_type='BASE TABLE'`
    );
    const tableKey = 'Tables_in_' + this.db;
    for (const tableInfo of tableResponse) {
      const tableName = tableInfo[tableKey];
      if (this.excludes[tableName]) {
        continue;
      }
      const responseItem = {
        table: tableName,
        schema: this.db,
        columns: await this.loadColumns(tableName),
        indexes: [],
        relations: [],
        primaryKey: null,
      };
      await this.loadConstraints(tableName, responseItem);

      response.push(responseItem);
    }

    //TODO improve this using indexes
    return response.map(responseItem => {
      const tableName = responseItem.table;
      if (this.hasManyRelations[tableName]) {
        responseItem.relations = responseItem.relations
          .concat(this.hasManyRelations[tableName]);
      }

      return responseItem;
    });
  }

  async loadConstraints(table, result) {
    const response = await this.query(
      'SHOW CREATE TABLE ' + table
    );
    const sql = response[0]['Create Table'].replace(/`/g, '');
    this.loadPrimaryKeys(sql, result);
    this.loadIndexes(sql, result);
    this.loadRelations(table, sql, result);
  }

  loadRelations(table, sql, result) {
    const relations = [...sql.matchAll(/FOREIGN KEY\s+\(([^\)]+)\)\s+REFERENCES\s+([^\(^\s]+)\s*\(([^\)]+)\)/g)];
    if (relations.length === 0) {
      return;
    }

    result['relations'] = relations.map((relation) => {
      const tableReference = this.resolveForeignTable(relation[2]);
      const result = {
        name: 'belongs-to',
        columns: this.columnize(relation[1]),
        references: this.columnize(relation[3]),
        on: tableReference,
      };
      this.storeHasManyRelation(table, result);

      return result
    });
  }

  storeHasManyRelation(table, belongsToRelation) {
    if (belongsToRelation.on.database !== this.db) {
      return;
    }
    const tableRelated = belongsToRelation.on.table;
    if (!this.hasManyRelations[tableRelated]) {
      this.hasManyRelations[tableRelated] = [];
    }

    this.hasManyRelations[tableRelated].push({
      name: 'has-many',
      columns: belongsToRelation.references,
      references: belongsToRelation.columns,
      on: {
        database: this.db,
        table: table,
      },
    })
  }

  resolveForeignTable(detail) {
    const parts = detail.split('.');

    if (parts.length == 2) {
      return {
        database: parts[0],
        table: parts[1],
      };
    }

    return {
      database: this.db,
      table: parts[0],
    };
  }

  loadIndexes(sql, result) {
    const indexes = [...sql.matchAll(/\s*(UNIQUE)?\s*(KEY|INDEX)\s+(\w+)\s+\(([^\)]+)\)/g)];
    if (indexes.length === 0) {
      return;
    }

    result['indexes'] = indexes.map((index) => {
      const type = index[1] || '';
      return {
        name: type.toLowerCase() === 'unique' ? 'unique' : 'index',
        columns: this.columnize(index[4]),
        index: index[3],
      }
    });
  }

  loadPrimaryKeys(sql, result) {
    const pk = [...sql.matchAll(/\s*(PRIMARY KEY)\s+\(([^\)]+)\)/g)];
    if (pk.length === 0) {
      return;
    }

    result['primaryKey'] = {
      columns: this.columnize(pk[0][2])
    };
  }

  columnize(columns) {
    return columns.trim().split(',').map(column => column.trim());
  }

  async loadColumns(table) {
    const columns = await this.query(
      'SHOW FULL COLUMNS FROM ' + table
    );
    return columns.map((column) => this.columnParser.parse(column));
  }

  query(query, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        query,
        params,
        (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve (results);
        }
      );
    });
  }
}

exports.Manager = Manager;