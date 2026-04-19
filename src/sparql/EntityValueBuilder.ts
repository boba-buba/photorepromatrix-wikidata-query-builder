import PropertyValueRelation from '@/data-model/PropertyValueRelation';
import { Condition } from '@/sparql/QueryRepresentation';
import rdfNamespaces from '@/sparql/rdfNamespaces';
import SyntaxBuilder from '@/sparql/SyntaxBuilder';
import TripleBuilder from '@/sparql/TripleBuilder';
import ValuePatternBuilder from '@/sparql/ValuePatternBuilder';
import { MinusPattern, Pattern, PropertyPath, Term } from 'sparqljs';

export default class EntityValueBuilder implements ValuePatternBuilder {
	private readonly expectedDatatype: string;
	private readonly tripleBuilder: TripleBuilder;
	private readonly syntaxBuilder: SyntaxBuilder;

	public constructor( expectedDatatype: string ) {
		this.expectedDatatype = expectedDatatype;
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
			subclasses,
		} = condition;
		if ( datatype !== this.expectedDatatype ) {
			throw new Error( 'Expected datatype ' + this.expectedDatatype + ', got: ' + datatype );
		}

		if ( typeof value !== 'string' ) {
			throw new Error( 'Unexpected ' + this.expectedDatatype + ' value type: ' + typeof value );
		}

		if ( this.canUseTruthyFastPath( condition ) ) {
			return [ this.buildTruthyMatchingPattern( subjectVariableName, propertyId, value, subclasses ) ];
		}

		let patterns: Pattern[] = [];
		const hasStableConditionId = typeof condition.conditionId === 'string' && condition.conditionId !== '';

		const statementVariable = this.syntaxBuilder.buildVariableTermFromName( 'statement' + conditionIndex );
		const entityToStatementTriple = this.syntaxBuilder.buildSimpleTriple(
			{
				termType: 'Variable',
				value: subjectVariableName,
			},
			rdfNamespaces.p + propertyId,
			statementVariable,
		);
		const statementToValueTriple = this.syntaxBuilder.buildPathTriple(
			statementVariable,
			this.buildStatementToValuePredicateItems(
				propertyId, subclasses,
			),
			this.buildObjectItems(
				conditionIndex,
				propertyId,
				repeatingPropertyIndex,
				propertyValueRelation,
				value,
				hasStableConditionId,
			),
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
			const notMatchingPattern = this.buildNotMatchingPattern( propertyId, value, subjectVariableName );
			patterns.push( notMatchingPattern );
		}

		return patterns;
	}

	private buildNotMatchingPattern( propertyId: string, value: string, subjectVariableName: string ): MinusPattern {
		const notMatchingValueTriple = this.syntaxBuilder.buildPathTriple(
			{
				termType: 'Variable',
				value: subjectVariableName,
			},
			[
				rdfNamespaces.p + propertyId,
				rdfNamespaces.ps + propertyId,
				// todo: should this have the subclass as well?
			],
			{
				termType: 'NamedNode',
				value: `${rdfNamespaces.wd}${value}`,
			},
		);
		return {
			type: 'minus',
			patterns: [ this.syntaxBuilder.buildBgpPattern( [ notMatchingValueTriple ] ) ],
		};
	}

	private canUseTruthyFastPath( condition: Condition ): boolean {
		return condition.propertyValueRelation === PropertyValueRelation.Matching &&
			condition.referenceRelation === 'regardless' &&
			condition.negate === false &&
			typeof condition.value === 'string' &&
			condition.value !== '';
	}

	private buildTruthyMatchingPattern(
		subjectVariableName: string,
		propertyId: string,
		value: string,
		subclasses: boolean,
	): Pattern {
		const subject: Term = {
			termType: 'Variable',
			value: subjectVariableName,
		};
		const object: Term = {
			termType: 'NamedNode',
			value: `${rdfNamespaces.wd}${value}`,
		};

		if ( !subclasses ) {
			return this.syntaxBuilder.buildBgpPattern( [
				this.syntaxBuilder.buildSimpleTriple( subject, rdfNamespaces.wdt + propertyId, object ),
			] );
		}

		return this.syntaxBuilder.buildBgpPattern( [
			this.syntaxBuilder.buildPathTriple(
				subject,
				[
					rdfNamespaces.wdt + propertyId,
					this.syntaxBuilder.buildPropertyPath( '*', [
						{
							termType: 'NamedNode',
							value: rdfNamespaces.wdt + this.getSubclassPropertyId( propertyId ),
						},
					] ),
				],
				object,
			),
		] );
	}

	private buildStatementToValuePredicateItems(
		propertyId: string, subclasses: boolean,
	): ( PropertyPath | string )[] {
		const statementToValuePredicateItems: ( PropertyPath | string )[] = [
			rdfNamespaces.ps + propertyId,
		];
		if ( subclasses ) {
			statementToValuePredicateItems.push(
				this.syntaxBuilder.buildPropertyPath( '*', [
					{
						termType: 'NamedNode',
						value: rdfNamespaces.wdt + this.getSubclassPropertyId( propertyId ),
					},
				] ),
			);
		}
		return statementToValuePredicateItems;
	}

	private getSubclassPropertyId( propertyId: string ): string {
		if ( !process.env.VUE_APP_SUBCLASS_PROPERTY_MAP ) {
			return 'P279';
		}
		const propertyMap = JSON.parse( process.env.VUE_APP_SUBCLASS_PROPERTY_MAP );
		if ( !propertyMap[ propertyId ] ) {
			return propertyMap.default;
		}
		return propertyMap[ propertyId ];
	}

	private buildObjectItems(
		conditionIndex: number,
		propertyId: string,
		propertyIndex: string,
		propertyValueRelation: PropertyValueRelation,
		value: string,
		hasStableConditionId: boolean,
	): Term {
		switch ( propertyValueRelation ) {
			case ( PropertyValueRelation.NotMatching ):
				return {
					termType: 'Variable',
					value: hasStableConditionId ? `conditionValue_${conditionIndex}` : 'instance',
				};
			case ( PropertyValueRelation.Regardless ):
				if ( !hasStableConditionId ) {
					return {
						termType: 'BlankNode',
						value: propertyIndex !== '' ? `anyValue${propertyId}_${propertyIndex}` : `anyValue${propertyId}`,
					};
				}
				return {
					termType: 'Variable',
					value: `conditionValue_${conditionIndex}`,
				};
			case ( PropertyValueRelation.Matching ):
				return {
					termType: 'NamedNode',
					value: `${rdfNamespaces.wd}${value}`,
				};
			default:
				throw new Error( `unsupported relation: ${propertyValueRelation}` );
		}
	}
}
