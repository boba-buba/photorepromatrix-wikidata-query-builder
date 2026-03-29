import PropertyValueRelation from '@/data-model/PropertyValueRelation';
import { Condition } from '@/sparql/QueryRepresentation';
import rdfNamespaces from '@/sparql/rdfNamespaces';
import SyntaxBuilder from '@/sparql/SyntaxBuilder';
import TripleBuilder from '@/sparql/TripleBuilder';
import ValuePatternBuilder from '@/sparql/ValuePatternBuilder';
import { FilterPattern, MinusPattern, OperationExpression, Pattern, Term, VariableTerm } from 'sparqljs';

type StringTermType = 'NamedNode' | 'Literal';

export default class StringValuePatternBuilder implements ValuePatternBuilder {
	private readonly ALLOWED_DATATYPES = [ 'string', 'external-id', 'url' ];

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
		subjectVariableName: string,
	): Pattern[] {
		const {
			propertyId,
			referenceRelation,
			propertyValueRelation,
			datatype,
			value,
			negate,
		} = condition;

		if ( !this.ALLOWED_DATATYPES.includes( datatype ) ) {
			throw new Error( 'Unexpected datatype: ' + datatype );
		}
		if ( typeof value !== 'string' ) {
			throw new Error( 'Unexpected value type: ' + typeof value );
		}
		const objectTermType: StringTermType = datatype === 'url' ? 'NamedNode' : 'Literal';
		let patterns: Pattern[] = [];

		const statementVariable = this.syntaxBuilder.buildVariableTermFromName( 'statement' + conditionIndex );
		const entityToStatementTriple = this.syntaxBuilder.buildSimpleTriple(
			{ termType: 'Variable', value: subjectVariableName },
			rdfNamespaces.p + propertyId,
			statementVariable,
		);
		const statementToValueTriple = this.syntaxBuilder.buildPathTriple(
			statementVariable,
			[ rdfNamespaces.ps + propertyId ],
			this.buildObjectItems( propertyId, propertyValueRelation, value, repeatingPropertyIndex, conditionIndex, objectTermType ),
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
				value,
				objectTermType,
				subjectVariableName,
			);
			patterns.push( notMatchingPattern );
		}

		if ( propertyValueRelation === PropertyValueRelation.Contains ) {
			patterns.push( this.buildContainsPattern( value, conditionIndex ) );
		}

		return patterns;
	}

	private buildContainsPattern( value: string, conditionIndex: number ): FilterPattern {
		const valueVariable = this.buildContainsVariableTerm( conditionIndex );

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
					value,
				},
			],
		};

		return {
			type: 'filter',
			expression: {
				type: 'operation',
				operator: 'contains',
				args: [ loweredStatementValueExpression, loweredUserValueExpression ],
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
		value: string,
		objectTermType: StringTermType,
		subjectVariableName: string,
	): MinusPattern {
		const notMatchingValueTriple = this.syntaxBuilder.buildPathTriple(
			{
				termType: 'Variable',
				value: subjectVariableName,
			},
			[
				rdfNamespaces.p + propertyId,
				rdfNamespaces.ps + propertyId,
			],
			{
				termType: objectTermType,
				value,
			},
		);
		return {
			type: 'minus',
			patterns: [ this.syntaxBuilder.buildBgpPattern( [ notMatchingValueTriple ] ) ],
		};
	}

	private buildObjectItems(
		propertyId: string,
		propertyValueRelation: PropertyValueRelation,
		value: string,
		propertyIndex: string,
		conditionIndex: number,
		objectTermType: StringTermType,
	): Term {
		switch ( propertyValueRelation ) {
			case ( PropertyValueRelation.Contains ):
				return this.buildContainsVariableTerm( conditionIndex );
			case ( PropertyValueRelation.NotMatching ):
				return {
					termType: 'Variable',
					value: 'instance', // TODO should this have + propertyId?
				};
			case ( PropertyValueRelation.Regardless ):
				return {
					termType: 'BlankNode',
					value: propertyIndex !== '' ? `anyValue${propertyId}_${propertyIndex}` : `anyValue${propertyId}`,
				};
			case ( PropertyValueRelation.Matching ):
				return {
					termType: objectTermType,
					value,
				};
			default:
				throw new Error( `unsupported relation: ${propertyValueRelation}` );
		}
	}

}
