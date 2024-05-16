# cz-ah-commit-zh

> git message 格式化辅助工具

## 使用方法

### 1.全局安装
```bash
npm install -g commitizen
npm install -g cz-ah-commit-zh
// 在全局新建一个 .czrc 配置文件(也可以在项目内配置)
echo '{ "path": "cz-ah-commit-zh" }' > ~/.czrc

// 使用时
使用`git cz` 代替 `git commit` 提交
```

### 2.项目内安装
``` bash
npm install -D commitizen
npm install -D cz-ah-commit-zh
```

在项目根目录新建 `.czrc`文件，并写入以下配置,
``` json
{
  "path": "cz-ah-commit-zh"
}
```
或者直接将配置写在`package.json`文件中
``` json
"config": {
  "commitizen": {
    "path": "cz-ah-commit-zh"
  }
},
```
使用 `npx cz` 提交

或者在package.json配置以下命令,使用 `npm run commit` 提交
``` json
"scripts": {
  "commit": "cz"
}
```





