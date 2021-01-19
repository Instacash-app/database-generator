const handlebars = require('handlebars');

handlebars.registerHelper('json', context => JSON.stringify(context, null, 2));

exports.default = {
  db: {
    type: 'mysql',
    configuration: {
      host: 'localhost',
      user: 'root',
      database: 'db',
      password: 'root'
    },
  },
  exclude: [
    'migrations'
  ],
  details: [
    {
      template: process.cwd() + '/templates/model.handlebars',
      directory: 'output/models',
      fileName(data) {
        return `${data.table}.js`
      }
    },
    {
      scope: 'all',
      template: process.cwd() + '/templates/model.handlebars',
      directory: 'output/models',
      fileName() {
        return 'index.js'
      }
    }
  ]
};
