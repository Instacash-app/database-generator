const {Manager: MySQLManger} = require('./mysql/manager');

class Factory {
  static manager(db, excludes) {
    switch (db.type) {
      case 'mysql':  return new MySQLManger(db.configuration, excludes);
      default: throw new Error('Database type not supported');
    }

  }
}

exports.Factory = Factory;