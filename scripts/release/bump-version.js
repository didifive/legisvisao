const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const currentVersion = pkg.version || '0.1.0';
const branch = process.env.PR_BRANCH || '';
const title = process.env.PR_TITLE || '';
const body = process.env.PR_BODY || '';

function determineBumpType(branch, title, body) {
  const fullText = `${branch} ${title} ${body}`.toLowerCase();

  // 1. Verificação de Major Version (Mudanças que Quebram / Nova Versão Maior)
  const majorKeywords = [
    'breaking change',
    'breaking changes',
    'break change',
    'break changes',
    'mudança que quebra',
    'mudanças que quebram',
    'mudanca que quebra',
    'mudancas que quebram',
    'mudança estruturante',
    'nova versão',
    'nova versao',
    'major version',
    'feat!:',
    'fix!:',
    'refactor!:',
  ];

  for (const kw of majorKeywords) {
    if (fullText.includes(kw)) {
      return 'major';
    }
  }

  // 2. Verificação de Patch Version (Hotfixes, Fixes, Docs, Chores e Correções Pontuais)
  const branchLower = branch.toLowerCase();
  const titleLower = title.toLowerCase();

  if (
    branchLower.startsWith('fix/') ||
    branchLower.startsWith('hotfix/') ||
    branchLower.startsWith('bugfix/') ||
    branchLower.startsWith('docs/') ||
    branchLower.startsWith('doc/') ||
    branchLower.startsWith('chore/') ||
    titleLower.startsWith('fix:') ||
    titleLower.startsWith('hotfix:') ||
    titleLower.startsWith('fix(') ||
    titleLower.startsWith('bugfix:') ||
    titleLower.startsWith('docs:') ||
    titleLower.startsWith('docs(') ||
    titleLower.startsWith('doc:') ||
    titleLower.startsWith('chore:') ||
    titleLower.startsWith('chore(') ||
    titleLower.includes('[patch]') ||
    titleLower.includes('(patch)') ||
    titleLower.includes('[docs]') ||
    titleLower.includes('(docs)') ||
    titleLower.includes('[chore]') ||
    titleLower.includes('(chore)') ||
    titleLower.includes('documentação') ||
    titleLower.includes('documentacao')
  ) {
    return 'patch';
  }

  // 3. Padrão para todo o restante (Features, Novas Telas, Refactors): Minor Version
  return 'minor';
}

function calculateNextVersion(version, bumpType) {
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  let [major, minor, patch] = parts;
  if (Number.isNaN(major)) major = 0;
  if (Number.isNaN(minor)) minor = 0;
  if (Number.isNaN(patch)) patch = 0;

  if (bumpType === 'major') {
    return `${major + 1}.0.0`;
  } else if (bumpType === 'minor') {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major}.${minor}.${patch + 1}`;
  }
}

const bumpType = determineBumpType(branch, title, body);
const newVersion = calculateNextVersion(currentVersion, bumpType);

// Atualiza o package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Atualiza o package-lock.json se existir
const packageLockPath = path.resolve(__dirname, '../../package-lock.json');
if (fs.existsSync(packageLockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    lock.version = newVersion;
    if (lock.packages?.['']) {
      lock.packages[''].version = newVersion;
    }
    fs.writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
    console.log(`🔒 package-lock.json sincronizado com a versão: ${newVersion}`);
  } catch (err) {
    console.warn('⚠️  Aviso ao atualizar package-lock.json:', err);
  }
}

console.log(`📦 Versão atual: ${currentVersion}`);
console.log(`🏷️  Tipo de bump identificado: ${bumpType.toUpperCase()}`);
console.log(`🚀 Nova versão gerada: ${newVersion}`);

// Comunica os outputs para o GitHub Actions
const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  fs.appendFileSync(githubOutput, `new_version=${newVersion}\n`);
  fs.appendFileSync(githubOutput, `bump_type=${bumpType}\n`);
  fs.appendFileSync(githubOutput, `current_version=${currentVersion}\n`);
}
