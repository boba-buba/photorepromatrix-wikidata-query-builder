import PropertyValueRelation from '@/data-model/PropertyValueRelation';
import { Condition } from '@/sparql/QueryRepresentation';
import rdfNamespaces from '@/sparql/rdfNamespaces';
import SyntaxBuilder from '@/sparql/SyntaxBuilder';
import TripleBuilder from '@/sparql/TripleBuilder';
import ValuePatternBuilder from '@/sparql/ValuePatternBuilder';
import { MinusPattern, Pattern } from 'sparqljs';

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

		// Value should be an object with text and language
		if ( typeof value !== 'object' || value === null || !( 'text' in value ) || !( 'language' in value ) ) {
			throw new Error( 'Unexpected value type for monolingualtext: ' + typeof value );
		}

		let { text, language } = value as { text: string; language: string | { code: string; autonym?: string } | null };

		// Normalize language to be just the code string (handle both object and string forms)
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

		let patterns: Pattern[] = [];

		const statementVariable = this.syntaxBuilder.buildVariableTermFromName( 'statement' + conditionIndex );
		const entityToStatementTriple = this.syntaxBuilder.buildSimpleTriple(
			{ termType: 'Variable', value: 'item' },
			rdfNamespaces.p + propertyId,
			statementVariable,
		);

		// Build the object term with language tag
		const objectTerm = {
			termType: 'Literal' as const,
			value: text,
			language: languageCode,
		};

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
			const notMatchingPattern = this.buildNotMatchingPattern( propertyId, text, languageCode );
			patterns.push( notMatchingPattern );
		}

		return patterns;
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
