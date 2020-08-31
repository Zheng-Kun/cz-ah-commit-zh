var ahCommitTypes = require('./lib/types.json');
var chalk = require('chalk');
var wrap = require('word-wrap');
const fuse = require('fuse.js')
// var ahTypes = require('./lib/types.json')

var configLoader = require('commitizen').configLoader;
var config = configLoader.load() || {};
var options = {
  types: config.types || ahCommitTypes,
  defaultType: process.env.CZ_TYPE || config.defaultType,
  defaultScope: process.env.CZ_SCOPE || config.defaultScope,
  defaultSubject: process.env.CZ_SUBJECT || config.defaultSubject,
  defaultBody: process.env.CZ_BODY || config.defaultBody,
  defaultIssues: process.env.CZ_ISSUES || config.defaultIssues,
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
  keys: ['name', 'code']
})

const questions = [
  {
    type: 'autocomplete',
    // type: 'list',
    name: 'type',
    message: "Select the type of change you're committing:",
    choices: choices,
    // source: (_, query) => Promise.resolve(choices),
    source: (_, query) =>  {
      // console.log(query,Promise.resolve(query ? fuzzy.search(query) : choices))
      return  Promise.resolve(query ? fuzzy.search(query) : choices) 
    }
  },
  {
    type: 'input',
    name: 'scope',
    message:
      'What is the scope of this change (e.g. component or file name): (press enter to skip)',
    // default: options.defaultScope,
    filter: function(value) {
      return options.disableScopeLowerCase
        ? value.trim()
        : value.trim().toLowerCase();
    }
  }, {
    type: 'input',
    name: 'subject',
    message: function(answers) {
      return (
        'Write a short, imperative tense description of the change (max ' +
        maxSummaryLength(options, answers) +
        ' chars):\n'
      );
    },
    default: options.defaultSubject,
    validate: function(subject, answers) {
      var filteredSubject = filterSubject(subject, options.disableSubjectLowerCase);
      return filteredSubject.length == 0
        ? 'subject is required'
        : filteredSubject.length <= maxSummaryLength(options, answers)
        ? true
        : 'Subject length must be less than or equal to ' +
          maxSummaryLength(options, answers) +
          ' characters. Current length is ' +
          filteredSubject.length +
          ' characters.';
    },
    transformer: function(subject, answers) {
      var filteredSubject = filterSubject(subject, options.disableSubjectLowerCase);
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
    name: 'body',
    message:
      'Provide a longer description of the change: (press enter to skip. Use imperative, present tense: “change” not “changed” nor “changes”,Includes motivation for the change and contrasts with previous behavior)\n',
    default: options.defaultBody
  },
  {
    type: 'confirm',
    name: 'isBreaking',
    message: 'Are there any breaking changes?',
    default: false
  },
  {
    type: 'input',
    name: 'breaking',
    message:
      'A BREAKING CHANGE commit requires a Footer. Please enter a longer description of the commit itself:(It can be description of the change, justification and migration notes)\n',
    when: function(answers) {
      return answers.isBreaking;
    },
    validate: function(breakingBody, answers) {
      return (
        breakingBody.trim().length > 0 ||
        'Footer is required for BREAKING CHANGE'
      );
    }
  },
  {
    type: 'confirm',
    name: 'issues',
    message: 'Please enter the key of the closed issue on JIRA.(e.g. PORT-1233 or PORT-12, PORT-13, PORT-15):(press enter to skip)\n',
    when: function(answers) {
      return answers.type.name === 'fix'
    },
  }

]

module.exports = {
  prompter: function(cz, commit) {
    // console.log("options",options)
    cz.prompt.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
    cz.prompt(questions).then(answers => {
      var wrapOptions = {
        trim: true,
        cut: false,
        newline: '\n',
        indent: '',
        width: options.maxLineWidth
      };
      // parentheses are only needed when a scope is present
      var scope = answers.scope ? '(' + answers.scope + ')' : '';

      var head = answers.type.emoji + " " + answers.type.name + scope + ': ' + answers.subject;
      var body = answers.body ? wrap(answers.body, wrapOptions) : false;

      var breaking = answers.breaking ? answers.breaking.trim() : '';
        breaking = breaking
          ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE:\s*?/, '')
          : '';
        breaking = breaking ? wrap(breaking, wrapOptions) : false;
      
        var issues = answers.issues ? answers.breaking.trim() : '';
        issues = issues ? 'Closes  ' + issues.replace(/^Closes\s*/, '')
        : '';

        commit([head, body, breaking, issues].filter(el => el).join('\n\n'))
    })
  }
}