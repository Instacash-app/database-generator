const handlebars = require('handlebars');
const fs = require('fs');

class TemplateManager {
  constructor(baseDirectory, details) {
    this.baseDirectory = baseDirectory;
    this.details = details;
  }

  process(data) {
    const ps = [];
    for (const detail of this.details) {
      const scope = detail.scope || 'each';
      if (scope === 'all') {
        ps.push(this.createByItem(data, detail));
      } else {
        ps.concat(this.createForAll(data, detail));
      }
    }

    return Promise.all(ps);
  }

  createForAll(data, detail) {
    const ps = [];
    const templateHandler = this.compile(detail.template);
    for (const item of data) {
      ps.push(this.createFile(templateHandler, item, detail));
    }

    return ps;
  }

  createByItem(data, detail) {
    const templateHandler = this.compile(detail.template);

    return this.createFile(templateHandler, data, detail);
  }

  async createFile(templateHandler, data, detail) {
    const output = templateHandler(data);

    let fileName = detail.scope === 'all' ?
      detail.fileName() :detail.fileName(data);

    const baseDirectory = `${this.baseDirectory}/${detail.directory}`;
    this.checkDirectory(baseDirectory);
    fileName = `${baseDirectory}/${fileName}`;

    fs.writeFileSync(fileName, output);
    console.log('Created: ' + fileName);
  }

  checkDirectory(directory) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  compile(template) {
    return handlebars.compile(
      fs.readFileSync(template, 'utf-8')
    );
  }
}

exports.TemplateManager = TemplateManager;