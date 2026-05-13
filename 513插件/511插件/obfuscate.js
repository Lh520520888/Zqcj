const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 检查是否安装了 javascript-obfuscator
try {
  require.resolve('javascript-obfuscator');
} catch (e) {
  console.log('正在安装 javascript-obfuscator...');
  execSync('npm init -y', { stdio: 'inherit' });
  execSync('npm install javascript-obfuscator --save-dev', { stdio: 'inherit' });
}

const JavaScriptObfuscator = require('javascript-obfuscator');

const sourceDir = path.join(__dirname, 'dist_b488693_obfuscated');
const jsFiles = [
  'auth.js',
  'background.js',
  'content-iframe.js',
  'content.js',
  'offscreen.js',
  'popup.js'
];

console.log('开始混淆 JavaScript 文件...\n');

jsFiles.forEach((file) => {
  const filePath = path.join(sourceDir, file);
  
  if (fs.existsSync(filePath)) {
    try {
      const originalCode = fs.readFileSync(filePath, 'utf8');
      
      const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        stringArray: true,
        stringArrayCallsTransform: false,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.5,
        transformObjectKeys: false,
        unicodeEscapeSequence: false
      });
      
      fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode());
      console.log(`✓ 已混淆: ${file}`);
    } catch (error) {
      console.error(`✗ 混淆失败: ${file}`);
      console.error('  错误:', error.message);
    }
  } else {
    console.error(`✗ 文件不存在: ${file}`);
  }
});

console.log('\n混淆完成！');
console.log(`混淆后的文件位于: ${sourceDir}`);
