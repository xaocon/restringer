// @ts-check

import {fileURLToPath} from 'url';
import {logger as flastLogger, applyIteratively, Arborist} from 'flast';
import {processors} from './processors/index.js';
import {detectObfuscation} from 'obfuscation-detector';
import {config, safe as safeMod, unsafe as unsafeMod, utils} from './modules/index.js';
const {normalizeScript} = utils.default;
import {readFileSync} from 'fs';
const __version__ = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')).version;
const safe: Record<string, Function> = {};
for (const funcName in safeMod) {
	safe[funcName] = safeMod[funcName].default || safeMod[funcName];
}
const unsafe: Record<string, Function> = {};
for (const funcName in unsafeMod) {
	unsafe[funcName] = unsafeMod[funcName].default || unsafeMod[funcName];
}

// Silence async errors
// process.on('uncaughtException', () => {});

export class REstringer {
	static __version__ = __version__;
	logger = flastLogger;

	script: string;
	normalize: boolean;
	modified: boolean;
	obfuscationName: string;
	_preprocessors: (Function | string)[];
	_postprocessors: (Function | string)[];
	maxIterations: number;
	detectObfuscationType: boolean;
	safeMethods: Array<(script: Arborist) => Arborist>;
	unsafeMethods: Array<(script: Arborist) => Arborist>;

	/**
	 * @param {string} script The target script to be deobfuscated
	 * @param {boolean} [normalize] Run optional methods which will make the script more readable
	 */
	constructor(script: string, normalize: boolean = true) {
		this.script = script;
		this.normalize = normalize;
		this.modified = false;
		this.obfuscationName = 'Generic';
		this._preprocessors = [];
		this._postprocessors = [];
		this.logger.setLogLevelLog();
		// @ts-ignore
		this.maxIterations = config.DEFAULT_MAX_ITERATIONS;
		this.detectObfuscationType = true;
		// Deobfuscation methods that don't use eval
		this.safeMethods = [
			safe.rearrangeSequences as unknown as (script: Arborist) => Arborist,
			safe.separateChainedDeclarators as unknown as (script: Arborist) => Arborist,
			safe.rearrangeSwitches as unknown as (script: Arborist) => Arborist,
			safe.normalizeEmptyStatements as unknown as (script: Arborist) => Arborist,
			safe.removeRedundantBlockStatements as unknown as (script: Arborist) => Arborist,
			safe.resolveRedundantLogicalExpressions as unknown as (script: Arborist) => Arborist,
			safe.unwrapSimpleOperations as unknown as (script: Arborist) => Arborist,
			safe.resolveProxyCalls as unknown as (script: Arborist) => Arborist,
			safe.resolveProxyVariables as unknown as (script: Arborist) => Arborist,
			safe.resolveProxyReferences as unknown as (script: Arborist) => Arborist,
			safe.resolveMemberExpressionReferencesToArrayIndex as unknown as (script: Arborist) => Arborist,
			safe.resolveMemberExpressionsWithDirectAssignment as unknown as (script: Arborist) => Arborist,
			safe.parseTemplateLiteralsIntoStringLiterals as unknown as (script: Arborist) => Arborist,
			safe.resolveDeterministicIfStatements as unknown as (script: Arborist) => Arborist,
			safe.replaceCallExpressionsWithUnwrappedIdentifier as unknown as (script: Arborist) => Arborist,
			safe.replaceEvalCallsWithLiteralContent as unknown as (script: Arborist) => Arborist,
			safe.replaceIdentifierWithFixedAssignedValue as unknown as (script: Arborist) => Arborist,
			safe.replaceIdentifierWithFixedValueNotAssignedAtDeclaration as unknown as (script: Arborist) => Arborist,
			safe.replaceNewFuncCallsWithLiteralContent as unknown as (script: Arborist) => Arborist,
			safe.replaceBooleanExpressionsWithIf as unknown as (script: Arborist) => Arborist,
			safe.replaceSequencesWithExpressions as unknown as (script: Arborist) => Arborist,
			safe.resolveFunctionConstructorCalls as unknown as (script: Arborist) => Arborist,
			safe.replaceFunctionShellsWithWrappedValue as unknown as (script: Arborist) => Arborist,
			safe.replaceFunctionShellsWithWrappedValueIIFE as unknown as (script: Arborist) => Arborist,
			safe.simplifyCalls as unknown as (script: Arborist) => Arborist,
			safe.unwrapFunctionShells as unknown as (script: Arborist) => Arborist,
			safe.unwrapIIFEs as unknown as (script: Arborist) => Arborist,
			safe.simplifyIfStatements as unknown as (script: Arborist) => Arborist,
		];
		// Deobfuscation methods that use eval
		this.unsafeMethods = [
			unsafe.resolveMinimalAlphabet as unknown as (script: Arborist) => Arborist,
			unsafe.resolveDefiniteBinaryExpressions as unknown as (script: Arborist) => Arborist,
			unsafe.resolveAugmentedFunctionWrappedArrayReplacements as unknown as (script: Arborist) => Arborist,
			unsafe.resolveMemberExpressionsLocalReferences as unknown as (script: Arborist) => Arborist,
			unsafe.resolveDefiniteMemberExpressions as unknown as (script: Arborist) => Arborist,
			unsafe.resolveBuiltinCalls as unknown as (script: Arborist) => Arborist,
			unsafe.resolveDeterministicConditionalExpressions as unknown as (script: Arborist) => Arborist,
			unsafe.resolveInjectedPrototypeMethodCalls as unknown as (script: Arborist) => Arborist,
			unsafe.resolveLocalCalls as unknown as (script: Arborist) => Arborist,
			unsafe.resolveEvalCallsOnNonLiterals as unknown as (script: Arborist) => Arborist,
		];
	}
// const unsafe = {};
// for (const funcName in unsafeMod) {
// 	unsafe[funcName] = unsafeMod[funcName].default || unsafeMod[funcName];
// }

	/**
	 * Determine the type of the obfuscation, and populate the appropriate pre- and post- processors.
	 */
	determineObfuscationType(): string {
		const detectedObfuscationType = detectObfuscation(this.script, false).slice(-1)[0];
		if (detectedObfuscationType) {
			this.obfuscationName = detectedObfuscationType;
			if (processors[detectedObfuscationType]) {
				({preprocessors: this._preprocessors, postprocessors: this._postprocessors} = processors[detectedObfuscationType]);
			}
		}
		this.logger.log(`[+] Obfuscation type is ${this.obfuscationName}`);
		return this.obfuscationName;
	}

	/**
	 * Iteratively applies safe and unsafe deobfuscation methods until no further changes occur.
	 * 
	 * Algorithm per iteration:
	 * 1. Apply all safe methods repeatedly until they stop making changes (up to maxIterations)
	 * 2. Apply all unsafe methods exactly once (they may be overreaching, so limited to 1 iteration)
	 * 3. Repeat the entire process until no changes occur in either phase
	 * 
	 * This approach maximizes safe deobfuscation before using potentially risky eval-based methods,
	 * while allowing unsafe methods to expose new opportunities for safe methods in subsequent iterations.
	 */
	_loopSafeAndUnsafeDeobfuscationMethods(): void {
		// Track whether any iteration made changes (vs this.modified which tracks current iteration only)
		let wasEverModified: boolean = false;
		let script: string;
		do {
			this.modified = false;
			script = applyIteratively(this.script, this.safeMethods, this.maxIterations);
			script = applyIteratively(script, this.unsafeMethods, 1);
			if (this.script !== script) {
				this.modified = true;
				this.script = script;
			}
			if (this.modified) wasEverModified = true;
		} while (this.modified); // Run this loop until the deobfuscation methods stop being effective.
		this.modified = wasEverModified;
	}

	/**
	 * Entry point for this class.
	 * Determine obfuscation type and run the pre- and post- processors accordingly.
	 * Run the deobfuscation methods in a loop until nothing more is changed.
	 * Normalize script to make it more readable.
	 * @param {boolean} [clean] Remove dead nodes after deobfuscation. Defaults to false.
	 * @return {boolean} true if the script was modified during deobfuscation; false otherwise.
	 */
	deobfuscate(clean: boolean = false): boolean {
		if (this.detectObfuscationType) this.determineObfuscationType();
		this._runProcessors(this._preprocessors);
		this._loopSafeAndUnsafeDeobfuscationMethods();
		this._runProcessors(this._postprocessors);
		if (this.modified && this.normalize) this.script = normalizeScript(this.script);
		if (clean) this.script = applyIteratively(this.script, [safe.removeDeadNodes], this.maxIterations);
		return this.modified;
	}

	/**
	 * Run specific deobfuscation which must run before or after the main deobfuscation loop
	 * in order to successfully complete deobfuscation.
	 * @param {Array<Function|string>} processors An array of either imported deobfuscation methods or the name of internal methods.
	 */
	_runProcessors(processors: (Function | string)[]): void {
		for (let i = 0; i < processors.length; i++) {
			const processor = processors[i];
			this.script = applyIteratively(this.script, [processor], 1);
		}
	}
}