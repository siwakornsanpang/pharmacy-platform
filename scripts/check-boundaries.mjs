import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)));
const skipped = new Set(['node_modules', '.next', 'dist', '.git', 'coverage']);
const serverClients = /^(?:drizzle-orm|drizzle-kit|pg|postgres|mysql2?|mongoose|mongodb|sequelize|typeorm|fastify|@fastify\/[^/]+|@prisma\/client|@supabase\/supabase-js)(?:\/|$)/;
const errors = [];
const configOptions = new Map();
const appPackages = new Map([['backend-api', 'apps/backend-api'], ['back-office', 'apps/backoffice'], ['pharmacy-web', 'apps/pharmacy-web']]);
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (skipped.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
  });
}
function importSpecifiers(file) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const result = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) result.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) result.push(node.arguments[0].text);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) result.push(node.moduleReference.expression.text);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) result.push(node.argument.literal.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}
function aliasTargets(project, specifier) {
  if (!configOptions.has(project)) {
    const configPath = join(project, 'tsconfig.json');
    let options = {};
    if (existsSync(configPath)) {
      const parsed = ts.getParsedCommandLineOfConfigFile(configPath, undefined, {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: () => { throw new Error(`Invalid tsconfig: ${configPath}`); },
      });
      if (!parsed || parsed.errors.length) throw new Error(`Invalid tsconfig: ${configPath}`);
      options = parsed.options;
    }
    configOptions.set(project, options);
  }
  const options = configOptions.get(project);
  return Object.entries(options.paths ?? {}).flatMap(([pattern, targets]) => {
    const [prefix, suffix = ''] = pattern.split('*');
    const wildcard = pattern.includes('*');
    if ((!wildcard && specifier !== pattern) || (wildcard && (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)))) return [];
    const match = wildcard ? specifier.slice(prefix.length, suffix ? -suffix.length : undefined) : '';
    return targets.map((target) => resolve(options.baseUrl ?? options.pathsBasePath ?? project, target.replace('*', match)));
  });
}
const sharedPackages = ['contracts', 'http'];
const projects = [...['backend-api', 'backoffice', 'pharmacy-web'].map((name) => join(root, 'apps', name)), ...sharedPackages.map(name => join(root, 'packages', name))];
for (const project of projects) {
  const owner = relative(root, project).split(sep).join('/');
  for (const file of walk(owner.startsWith('packages/') ? join(project, 'src') : project)) for (const specifier of importSpecifiers(file)) {
    const paths = specifier.startsWith('.') || specifier.startsWith('/') ? [resolve(dirname(file), specifier)] : aliasTargets(project, specifier);
    const targets = paths.map((path) => relative(root, path).split(sep).join('/'));
    let reason;
    const privatePackage = sharedPackages.find(name => new RegExp(`^@pharmacy/${name}/(?:src|dist)(?:/|$)`).test(specifier) || targets.some(target => new RegExp(`^packages/${name}/(?:src|dist)(?:/|$)`).test(target) && owner !== `packages/${name}`));
    if (privatePackage) reason = `private ${privatePackage} import`;
    else if (targets.some((target) => target.startsWith('apps/') && !target.startsWith(`${owner}/`)) || (appPackages.has(specifier.split('/')[0]) && appPackages.get(specifier.split('/')[0]) !== owner)) reason = 'cross-app import';
    else if (owner !== 'apps/backend-api' && serverClients.test(specifier)) reason = 'server client import';
    else if (owner.startsWith('packages/') && (!specifier.startsWith('.') || targets.some(target => !target.startsWith(`${owner}/`)))) reason = `${owner.slice('packages/'.length)} must have no external runtime or server imports`;
    if (reason) errors.push(`${relative(root, file)}: ${reason}: ${specifier}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('App and public-contract import boundaries passed.');
