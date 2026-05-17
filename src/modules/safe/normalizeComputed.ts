// @ts-check

import {Arborist, ASTNode} from 'flast';

// A string that tests true for this regex cannot be used as a variable name.
const BAD_IDENTIFIER_CHARS_REGEX = /([:!@#%^&*(){}[\]\\|/`'"]|[^\da-zA-Z_$])/;
// A regex for a valid identifier name.
const VALID_IDENTIFIER_BEGINNING = /^[A-Za-z$_]/;

/**
 * Find all computed member expressions, method definitions, and properties that can be converted to dot notation.
 * @param {Arborist} arb An Arborist instance
 * @param {Function} [candidateFilter] a filter to apply on the candidates list
 * @return {ASTNode[]} Array of nodes that match the criteria for normalization
 */

export function normalizeComputedMatch(arb: Arborist, candidateFilter = () => true) {
	const matchingNodes = [];
	
	// Process MemberExpression nodes: obj['prop'] -> obj.prop
	const memberExpressions = arb.ast[0].typeMap?.MemberExpression;
	if (memberExpressions) {
		for (let i = 0; i < memberExpressions.length; i++) {
			const n = memberExpressions[i];
			if (typeof n !== "string")
			if (n.computed &&
				n.property?.type === 'Literal' &&
				VALID_IDENTIFIER_BEGINNING.test(n.property.value) &&
				!BAD_IDENTIFIER_CHARS_REGEX.test(n.property.value) &&
				candidateFilter(n)) {
				matchingNodes.push(n);
			}
		}
	}
	
	// Process MethodDefinition nodes: ['method']() {} -> method() {}
	const methodDefinitions = arb.ast[0].typeMap?.MethodDefinition;
	if (memberExpressions) {
		for (let i = 0; i < methodDefinitions.length; i++) {
			const n = methodDefinitions[i];
			if (n.computed &&
				n.key.type === 'Literal' &&
				VALID_IDENTIFIER_BEGINNING.test(n.key.value) &&
				!BAD_IDENTIFIER_CHARS_REGEX.test(n.key.value) &&
				candidateFilter(n)) {
				matchingNodes.push(n);
			}
		}
	}
	
	// Process Property nodes: {['prop']: value} -> {prop: value}, and also {'string': value} -> {string: value}
	const properties = arb.ast[0].typeMap?.Property;
	if (properties) {
		for (let i = 0; i < properties.length; i++) {
			const n = properties[i];
			if (n.key.type === 'Literal' &&
				VALID_IDENTIFIER_BEGINNING.test(n.key.value) &&
				!BAD_IDENTIFIER_CHARS_REGEX.test(n.key.value) &&
				candidateFilter(n)) {
				matchingNodes.push(n);
			}
		}
	}
	
	return matchingNodes;
}

/**
 * Transform a computed property access node to use dot notation.
 * @param {Arborist} arb
 * @param {Object} n The AST node to transform
 * @return {Arborist}
 */
export function normalizeComputedTransform(arb: Arborist, n) {
	const relevantProperty = n.type === 'MemberExpression' ? 'property' : 'key';
	arb.markNode(n, {
		...n,
		computed: false,
		[relevantProperty]: {
			type: 'Identifier',
			name: n[relevantProperty].value,
		},
	});
	return arb;
}

/**
 * Convert computed property access to dot notation where the property is a valid identifier.
 * This normalizes bracket notation to more readable dot notation.
 * 
 * Transforms:
 *   console['log'] -> console.log
 *   obj['methodName']() -> obj.methodName()
 *   {['propName']: value} -> {propName: value}
 * 
 * Only applies to string literals that form valid JavaScript identifiers
 * (start with letter/$/_, contain only alphanumeric/_/$ characters).
 * 
 * @param {Arborist} arb
 * @param {Function} [candidateFilter] a filter to apply on the candidates list
 * @return {Arborist}
 */
export default function normalizeComputed(arb: Arborist, candidateFilter = () => true) {
	const matchingNodes = normalizeComputedMatch(arb, candidateFilter);
	
	for (let i = 0; i < matchingNodes.length; i++) {
		arb = normalizeComputedTransform(arb, matchingNodes[i]);
	}
	return arb;
}