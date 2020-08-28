#!/bin/bash
echo "Installing Commitizen In Project"
npm install -D commitizen
echo "Installing JIRA smart commits"
npm install -g cz-jira-smart-commit
echo "Creating a global config file"
echo '{ "path": "/usr/local/lib/node_modules/cz-jira-smart-commit/" }' > ~/.czrc