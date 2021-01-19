const rootDirectory = process.cwd();
const configurationFile = rootDirectory + '/db-generator.config';
const configuration = require(configurationFile).default;

const { Factory } = require('./db/factory');
const manager = Factory.manager(configuration.db, configuration.exclude);
const { TemplateManager } = require('./template/manager');
const templateManager = new TemplateManager(rootDirectory, configuration.details);

manager.scan()
  .then((data) => templateManager.process(data))
  .catch(console.log)
  .finally(() => {
    console.log('Process finished!');
    process.exit();
  });






//create files