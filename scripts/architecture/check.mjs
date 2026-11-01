import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOTS = ['app', 'components', 'features', 'store', 'lib'];
const SOURCE = /\.(?:tsx?|jsx?|mjs)$/;

// docs/ARCHITECTURE.md §4; TECH_STACK §4 / AI-1 and PHR-1 forbid client provider/telemetry SDKs.
const PROVIDER_PACKAGES = [
  /^openai(?:\/|$)/, /^@anthropic-ai\/sdk(?:\/|$)/, /^@ai-sdk\//, /^ai(?:\/|$)/,
  /^@google\/generative-ai(?:\/|$)/, /^firebase(?:\/|$)/, /^@supabase\//,
  /^@sentry\//, /^posthog-/, /^@segment\//, /^mixpanel-/, /^@amplitude\//,
  /^@bugsnag\//, /^@datadog\//,
];

// docs/ARCHITECTURE.md §4–§5: native data access belongs behind infrastructure/services.
const NATIVE_DATA = /^(?:expo-sqlite|expo-file-system|expo-sharing)(?:\/|$)/;
// docs/ARCHITECTURE.md §4–§5; TECH_STACK §3: HealthKit belongs only to health services.
const HEALTHKIT = /healthkit|^react-native-health(?:\/|$)/i;

function filesIn(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : entry.isFile() && SOURCE.test(file) ? [file] : [];
  });
}

function localTarget(root, file, specifier) {
  if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return null;
  const target = specifier.startsWith('@/') ? path.resolve(root, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
  const resolved = [target, ...['.ts', '.tsx', '.js', '.jsx', '.mjs'].map((ext) => target + ext), path.join(target, 'index.ts')]
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return path.relative(root, resolved ?? target).split(path.sep).join('/');
}

export function checkArchitecture(root = process.cwd()) {
  root = path.resolve(root);
  const violations = [];
  for (const file of ROOTS.flatMap((directory) => filesIn(path.join(root, directory)))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const [layer, domain] = relative.split('/');
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const add = (node, rule, message, section) => violations.push({
      path: relative, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, rule, message, section,
    });
    const zustandFactories = new Set();
    const zustandNamespaces = new Set();
    const styleSheets = new Set(['StyleSheet']);
    const reactNativeNamespaces = new Set();

    function checkImport(node, specifier, typeOnly = false, names = []) {
      const target = localTarget(root, file, specifier);
      const dependency = target?.split('/')[0];
      const isPackage = target === null;
      // docs/ARCHITECTURE.md §4: no concrete provider SDKs in the application source tree.
      if (isPackage && PROVIDER_PACKAGES.some((pattern) => pattern.test(specifier))) {
        add(node, 'provider-sdk', `Provider/telemetry package '${specifier}' is forbidden.`, 4);
      }
      // docs/ARCHITECTURE.md §4: HealthKit adapters are owned by the health service boundary.
      if (isPackage && HEALTHKIT.test(specifier) && !relative.startsWith('features/health/services/')) {
        add(node, 'healthkit-boundary', `HealthKit package '${specifier}' belongs in features/health/services/.`, 4);
      }
      // docs/ARCHITECTURE.md §2, §5: shared client stores live only in /store.
      if (isPackage && /^zustand(?:\/|$)/.test(specifier) && layer !== 'store') {
        add(node, 'store-placement', 'Zustand imports belong in store/.', 5);
      }
      // docs/ARCHITECTURE.md §4: enforce the importer/dependency table, including type-only contracts.
      let forbidden = false;
      if (layer === 'components' && target !== null) {
        forbidden = dependency !== 'components' && !(target === 'lib/theme' || target.startsWith('lib/theme/')) && !(dependency === 'features' && typeOnly);
      } else if (layer === 'features' && target !== null) {
        forbidden = !['features', 'lib'].includes(dependency) || (dependency === 'features' && target.split('/')[1] !== domain && !/^features\/[^/]+\/index\.ts$/.test(target));
      } else if (layer === 'store' && target !== null) {
        forbidden = dependency !== 'store' && !(dependency === 'features' && typeOnly) && !/^lib\/(?:utils|contracts)\//.test(target);
      } else if (layer === 'lib' && target !== null) {
        forbidden = ROOTS.filter((name) => name !== 'lib').includes(dependency);
      }
      if (isPackage && ['app', 'components', 'store'].includes(layer) && NATIVE_DATA.test(specifier)) forbidden = true;
      if (isPackage && layer === 'store' && /^@tanstack\/react-query(?:\/|$)/.test(specifier)) forbidden = true;
      if (isPackage && layer === 'components' && /^@tanstack\/react-query(?:\/|$)/.test(specifier) && names.some((name) => /mutation/i.test(name) || name === '*')) forbidden = true;
      if (isPackage && ['app', 'components', 'store'].includes(layer) && specifier === 'react-native' && names.some((name) => ['NativeModules', 'TurboModuleRegistry'].includes(name))) forbidden = true;
      if (forbidden) add(node, 'import-boundary', `${layer}/ cannot import '${specifier}'${typeOnly ? ' (type-only)' : ''}.`, 4);
    }

    // docs/ARCHITECTURE.md §2, §4: features contain no JSX, including JSX-designated files.
    if (layer === 'features' && /\.[jt]sx$/.test(file)) add(source, 'feature-jsx', 'Features must not contain .tsx/.jsx files.', 4);
    let stores = 0;
    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        const elements = bindings && ts.isNamedImports(bindings) ? bindings.elements : [];
        const typeOnly = !!clause?.isTypeOnly || (!!elements.length && !clause?.name && elements.every((element) => element.isTypeOnly));
        const specifier = node.moduleSpecifier.text;
        checkImport(node, specifier, typeOnly, bindings && ts.isNamespaceImport(bindings) ? ['*'] : elements.map((element) => (element.propertyName ?? element.name).text));
        if (/^zustand(?:\/|$)/.test(specifier) && !typeOnly) {
          for (const element of elements) if (['create', 'createStore'].includes((element.propertyName ?? element.name).text)) zustandFactories.add(element.name.text);
          if (bindings && ts.isNamespaceImport(bindings)) zustandNamespaces.add(bindings.name.text);
          if (clause?.name) zustandFactories.add(clause.name.text);
        }
        if (specifier === 'react-native') {
          for (const element of elements) if ((element.propertyName ?? element.name).text === 'StyleSheet') styleSheets.add(element.name.text);
          if (bindings && ts.isNamespaceImport(bindings)) reactNativeNamespaces.add(bindings.name.text);
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const elements = node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements : [];
        checkImport(node, node.moduleSpecifier.text, node.isTypeOnly || (!!elements.length && elements.every((element) => element.isTypeOnly)), elements.length ? elements.map((element) => (element.propertyName ?? element.name).text) : ['*']);
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        checkImport(node, node.argument.literal.text, true);
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        checkImport(node, node.arguments[0].text, false, ['*']);
      }
      // docs/ARCHITECTURE.md §2, §4: catch JSX syntax as well as JSX file extensions.
      if (layer === 'features' && !/\.[jt]sx$/.test(file) && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))) add(node, 'feature-jsx', 'Features must not contain JSX.', 4);
      // docs/ARCHITECTURE.md §3: NativeWind replaces JSX style attributes and StyleSheet.create.
      if (['app', 'components', 'features'].includes(layer)) {
        if (ts.isJsxAttribute(node) && node.name.getText(source) === 'style') add(node, 'inline-style', 'Use NativeWind classes, not a JSX style attribute.', 3);
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'create') {
          const owner = node.expression.expression;
          if ((ts.isIdentifier(owner) && styleSheets.has(owner.text)) || (ts.isPropertyAccessExpression(owner) && owner.name.text === 'StyleSheet' && reactNativeNamespaces.has(owner.expression.getText(source)))) add(node, 'inline-style', 'Use NativeWind classes, not StyleSheet.create.', 3);
        }
      }
      // docs/ARCHITECTURE.md §5: one focused Zustand store per file (including curried factories).
      if (layer === 'store' && ts.isCallExpression(node)) {
        const callee = node.expression;
        const factory = (ts.isIdentifier(callee) && (zustandFactories.has(callee.text) || ['create', 'createStore'].includes(callee.text))) || (ts.isPropertyAccessExpression(callee) && zustandNamespaces.has(callee.expression.getText(source)) && ['create', 'createStore'].includes(callee.name.text));
        if (factory && ++stores > 1) add(node, 'store-count', 'Only one create/createStore call is allowed per store file.', 5);
      }
      // docs/ARCHITECTURE.md §4: infrastructure owns logging; DATA-7 forbids bypassing lib/logger.ts.
      if (relative !== 'lib/logger.ts' && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && node.expression.getText(source) === 'console') add(node, 'console-usage', 'Use lib/logger.ts instead of console.', 4);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return violations;
}
