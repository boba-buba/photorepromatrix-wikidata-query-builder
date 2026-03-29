import PropertyValueRelation from '@/data-model/PropertyValueRelation';
import { Condition } from '@/sparql/QueryRepresentation';
import rdfNamespaces from '@/sparql/rdfNamespaces';
import SyntaxBuilder from '@/sparql/SyntaxBuilder';
import TripleBuilder from '@/sparql/TripleBuilder';
import ValuePatternBuilder from '@/sparql/ValuePatternBuilder';
import { FilterPattern, MinusPattern, OperationExpression, Pattern, Term, VariableTerm } from 'sparqljs';

export default class MonolingualTextValuePatternBuilder implements ValuePatternBuilder {
	private readonly tripleBuilder: TripleBuilder;
	private readonly syntaxBuilder: SyntaxBuilder;

	public constructor() {
		this.tripleBuilder = new TripleBuilder();
		this.syntaxBuilder = new SyntaxBuilder();
	}

	public buildValuePatternFromCondition(
		condition: Condition,
		conditionIndex: number,
		repeatingPropertyIndex: string,
	): Pattern[] {
		const {
			propertyId,
			referenceRelation,
			propertyValueRelation,
			datatype,
			value,
			negate,
		} = condition;

		if ( datatype !== 'monolingualtext' ) {
			throw new Error( 'Unexpected datatype: ' + datatype );
		}

		const normalizedValue = this.normalizeValue( value, propertyValueRelation );

		let patterns: Pattern[] = [];

		const statementVariable = this.syntaxBuilder.buildVariableTermFromName( 'statement' + conditionIndex );
		const entityToStatementTriple = this.syntaxBuilder.buildSimpleTriple(
			{ termType: 'Variable', value: 'item' },
			rdfNamespaces.p + propertyId,
			statementVariable,
		);

		const objectTerm = this.buildObjectTerm(
			propertyId,
			propertyValueRelation,
			normalizedValue,
			repeatingPropertyIndex,
			conditionIndex,
		);

		const statementToValueTriple = this.syntaxBuilder.buildPathTriple(
			statementVariable,
			[ rdfNamespaces.ps + propertyId ],
			objectTerm,
		);

		const entityValuePattern = this.syntaxBuilder.buildBgpPattern( [
			entityToStatementTriple,
			statementToValueTriple,
		] );
		patterns.push( entityValuePattern );

		const referenceFilterPattern = this.tripleBuilder.buildReferenceFilterPattern(
			referenceRelation,
			statementVariable,
		);
		if ( referenceFilterPattern !== null ) {
			patterns.push( referenceFilterPattern );
			patterns = [ { type: 'group', patterns } ];
		}

		if ( negate ) {
			patterns = [ {
				type: 'minus',
				patterns,
			} ];
		}

		if ( propertyValueRelation === PropertyValueRelation.NotMatching ) {
			const notMatchingPattern = this.buildNotMatchingPattern(
				propertyId,
				normalizedValue.text,
				normalizedValue.languageCode,
			);
			patterns.push( notMatchingPattern );
		}

		if ( propertyValueRelation === PropertyValueRelation.Contains ) {
			patterns.push( this.buildContainsPattern( conditionIndex, normalizedValue.text, normalizedValue.languageCode ) );
		}

		return patterns;
	}

	private buildObjectTerm(
		propertyId: string,
		propertyValueRelation: PropertyValueRelation,
		normalizedValue: { text: string; languageCode: string | null },
		repeatingPropertyIndex: string,
		conditionIndex: number,
	): Term {
		switch ( propertyValueRelation ) {
			case PropertyValueRelation.Regardless:
				return {
					termType: 'BlankNode',
					value: repeatingPropertyIndex !== '' ?
						`anyValue${propertyId}_${repeatingPropertyIndex}` :
						`anyValue${propertyId}`,
				};
			case PropertyValueRelation.NotMatching:
				return {
					termType: 'Variable',
					value: 'instance',
				};
			case PropertyValueRelation.Contains:
				return this.buildContainsVariableTerm( conditionIndex );
			case PropertyValueRelation.Matching:
				if ( !normalizedValue.languageCode ) {
					throw new Error( 'Language must be specified for monolingualtext value' );
				}
				return {
					termType: 'Literal',
					value: normalizedValue.text,
					language: normalizedValue.languageCode,
				};
			default:
				throw new Error( `unsupported relation: ${propertyValueRelation}` );
		}
	}

	private normalizeValue(
		value: unknown,
		propertyValueRelation: PropertyValueRelation,
	): { text: string; languageCode: string | null } {
		if ( propertyValueRelation === PropertyValueRelation.Regardless ) {
			return {
				text: '',
				languageCode: null,
			};
		}

		if ( typeof value !== 'object' || value === null || !( 'text' in value ) || !( 'language' in value ) ) {
			throw new Error( 'Unexpected value type for monolingualtext: ' + typeof value );
		}

		const { text, language } = value as {
			text: string;
			language: string | { code: string; autonym?: string } | null;
		};

		let languageCode: string | null = null;
		if ( language ) {
			if ( typeof language === 'string' ) {
				languageCode = language;
			} else if ( typeof language === 'object' && 'code' in language ) {
				languageCode = language.code;
			}
		}

		if ( !languageCode ) {
			throw new Error( 'Language must be specified for monolingualtext value' );
		}

		return {
			text,
			languageCode,
		};
	}

	private buildContainsPattern(
		conditionIndex: number,
		text: string,
		languageCode: string | null,
	): FilterPattern {
		if ( !languageCode ) {
			throw new Error( 'Language must be specified for monolingualtext value' );
		}

		const valueVariable = this.buildContainsVariableTerm( conditionIndex );

		const languageExpression: OperationExpression = {
			type: 'operation',
			operator: 'lang',
			args: [ valueVariable ],
		};

		const languageFilterExpression: OperationExpression = {
			type: 'operation',
			operator: '=',
			args: [
				languageExpression,
				{
					termType: 'Literal',
					value: languageCode,
				},
			],
		};

		const valueAsStringExpression: OperationExpression = {
			type: 'operation',
			operator: 'str',
			args: [ valueVariable ],
		};

		const loweredStatementValueExpression: OperationExpression = {
			type: 'operation',
			operator: 'lcase',
			args: [ valueAsStringExpression ],
		};

		const loweredUserValueExpression: OperationExpression = {
			type: 'operation',
			operator: 'lcase',
			args: [
				{
					termType: 'Literal',
					value: text,
				},
			],
		};

		const containsFilterExpression: OperationExpression = {
			type: 'operation',
			operator: 'contains',
			args: [ loweredStatementValueExpression, loweredUserValueExpression ],
		};

		return {
			type: 'filter',
			expression: {
				type: 'operation',
				operator: '&&',
				args: [ languageFilterExpression, containsFilterExpression ],
			},
		};
	}

	private buildContainsVariableTerm( conditionIndex: number ): VariableTerm {
		return {
			termType: 'Variable',
			value: `containsValue${conditionIndex}`,
		};
	}

	private buildNotMatchingPattern(
		propertyId: string,
		text: string,
		language: string,
	): MinusPattern {
		const notMatchingValueTriple = this.syntaxBuilder.buildPathTriple(
			{
				termType: 'Variable',
				value: 'item',
			},
			[
				rdfNamespaces.p + propertyId,
				rdfNamespaces.ps + propertyId,
			],
			{
				termType: 'Literal',
				value: text,
				language: language,
			},
		);

		return {
			type: 'minus',
			patterns: [
				{
					type: 'bgp',
					triples: [ notMatchingValueTriple ],
				},
			],
		};
	}
}
