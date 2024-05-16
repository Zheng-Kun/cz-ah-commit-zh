var ahCommitTypes = require('./lib/types.json');
var chalk = require('chalk');
var wrap = require('word-wrap');
const fuse = require('fuse.js')
// var ahTypes = require('./lib/types.json')

var configLoader = require('commitizen').configLoader;
var config = configLoader.load() || {};
var options = {
  types: config.types || ahCommitTypes,
  defaultType: process.env.CZ_TYPE || config.defaultType || '',
  defaultScope: process.env.CZ_SCOPE || config.defaultScope || '',
  defaultSubject: process.env.CZ_SUBJECT || config.defaultSubject || '',
  defaultBody: process.env.CZ_BODY || config.defaultBody || '',
  defaultIssues: process.env.CZ_ISSUES || config.defaultIssues || '',
  disableScopeLowerCase:
    process.env.DISABLE_SCOPE_LOWERCASE || config.disableScopeLowerCase,
  disableSubjectLowerCase:
    process.env.DISABLE_SUBJECT_LOWERCASE || config.disableSubjectLowerCase,
  maxHeaderWidth:
    (process.env.CZ_MAX_HEADER_WIDTH &&
      parseInt(process.env.CZ_MAX_HEADER_WIDTH)) ||
    config.maxHeaderWidth ||
    100,
  maxLineWidth:
    (process.env.CZ_MAX_LINE_WIDTH &&
      parseInt(process.env.CZ_MAX_LINE_WIDTH)) ||
    config.maxLineWidth ||
    100
}
function getEmojiChoices(types) {
  const maxNameLength = types.reduce((maxLength, type) => (type.name.length > maxLength ? type.name.length : maxLength), 0)

  return types.map(choice => ({
    name: `${choice.name.padEnd(maxNameLength)}  ${choice.emoji}  ${choice.description}`,
    value: {
      emoji: choice.emoji,
      name: choice.name,
    },
    code: choice.code
  }))
}

var filterSubject = function(subject, disableSubjectLowerCase) {
  subject = subject.trim();
  if (!disableSubjectLowerCase && subject.charAt(0).toLowerCase() !== subject.charAt(0)) {
    subject =
      subject.charAt(0).toLowerCase() + subject.slice(1, subject.length);
  }
  // 去掉结尾的句号
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
};

var headerLength = function(answers) {
  return (
    (answers.type.name + answers.type.emoji).length + 2 + (answers.scope ? answers.scope.length + 2 : 0)
  );
};

var maxSummaryLength = function(options, answers) {
  return options.maxHeaderWidth - headerLength(answers);
};



let choices = getEmojiChoices(ahCommitTypes)
// console.log(choices)

const fuzzy = new fuse(choices, {
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['name', 'description']
})

const questions = [
  {
    type: 'autocomplete',
    name: 'type', // 提交类型
    message: "选择您本次提交的更改类型:",
    choices: choices,
    source: (_, query) =>  {
      // 搜索匹配
      return  Promise.resolve(query ? fuzzy.search(query).map(el => el.item) : choices) 
    }
  },
  {
    type: 'input',
    name: 'scope', // 提交范围
    message:
      '这次变化的范围 (可填模块名或文件名): (按回车跳过)',
    // default: options.defaultScope,
    filter: function(value) {
      return options.disableScopeLowerCase
        ? value.trim()
        : value.trim().toLowerCase();
    }
  },
  {
    type: 'input',
    name: 'subject', // 提交简介
    message: function(answers) {
      return (
        '写一个简短的变化描述，使用祈使句 (最多 ' +
        maxSummaryLength(options, answers) +
        ' 个字符):\n'
      );
    },
    default: options.defaultSubject,
    validate: function(subject, answers) {
      var filteredSubject = filterSubject(subject, options.disableSubjectLowerCase);
      return filteredSubject.length == 0
        ? '简介为必填项' // 简介必填
        : filteredSubject.length <= maxSummaryLength(options, answers) // 长度控制
        ? true
        : '简介的长度不能超过' +
          maxSummaryLength(options, answers) +
          ' 个字符. 当前为 ' +
          filteredSubject.length +
          ' 个字符';
    },
    transformer: function(subject, answers) {
      var filteredSubject = filterSubject(subject, options.disableSubjectLowerCase); // 长短提示
      var color =
        filteredSubject.length <= maxSummaryLength(options, answers)
          ? chalk.green
          : chalk.red;
      return color('(' + filteredSubject.length + ') ' + subject);
    },
    filter: function(subject) {
      return filterSubject(subject, options.disableSubjectLowerCase);
    }
  },
  {
    type: 'input',
    name: 'body', // 详细的提交描述，选填
    message:
      '提供更详细的更改描述: (按回车跳过. 使用祈使句（使用“修改XXX”，而不是“修改了XXX”）,包括改变的动机和与之前的变化)\n',
    default: options.defaultBody
  },
  {
    type: 'confirm',
    name: 'isBreaking', //是否为不兼容的更改
    message: '是否为不兼容（破坏性）的变更?(default: n)',
    default: false
  },
  {
    type: 'input',
    name: 'breaking', // 不兼容的更改必须添加Footer，详细描述更改
    message:
      'BREAKING CHANGE（破坏性/不兼容的更改）强制要求填写Footer. 请输入更详细的描述(包括变更内容、变更理由和迁移说明):\n',
    when: function(answers) {
      return answers.isBreaking;
    },
    validate: function(breakingBody, answers) {
      return (
        breakingBody.trim().length > 0 ||
        'Footer 对于 BREAKING CHANGE 为必填项'
      );
    }
  },
  {
    type: 'input',
    name: 'issues', // 如果是fix类型的提交，可以填写JIRA上的bug编号
    message: '请输入修复BUG的JIRA/GITHUB/禅道编号，多个编号使用", "分割.(例如单个bug：“BUG-1233” ；或者多个Bug： “BUG-12, BUG-13, BUG-15”):(按回车键跳过)\n',
    when: function(answers) {
      return answers.type.name === 'fix'
    },
  }
  // TODO 如果是revert更改，必须填写revert的提交id

]

module.exports = {
  prompter: function(cz, commit) {
    cz.prompt.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
    cz.prompt(questions).then(answers => {
      let wrapOptions = {
        trim: true,
        cut: false,
        newline: '\n',
        indent: '',
        width: options.maxLineWidth
      };

      let scope = answers.scope ? '(' + answers.scope + ')' : '';

      let head = answers.type.name + scope + ': ' + answers.type.emoji + answers.subject;
      let body = answers.body ? wrap(answers.body, wrapOptions) : false;

      let breaking = answers.breaking ? answers.breaking.trim() : '';
      breaking = breaking
        ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE:\s*?/, '')
        : '';
      breaking = breaking ? wrap(breaking, wrapOptions) : false;
      
      let issues = answers.issues ? answers.issues.trim() : '';
      issues = issues ? 'Closes  ' + issues.replace(/^Closes\s*/, '')
      : '';

      commit([head, body, breaking, issues].filter(el => el).join('\n\n'))
    })
  }
}