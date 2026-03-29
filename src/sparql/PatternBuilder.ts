import DateValuePatternBuilder from '@/sparql/DateValuePatternBuilder';
import EntityValueBuilder from '@/sparql/EntityValueBuilder';
import LimitedSupportPatternBuilder from '@/sparql/LimitedSupportPatternBuilder';
import MonolingualTextValuePatternBuilder from '@/sparql/MonolingualTextValuePatternBuilder';
import QuantityValuePatternBuilder from '@/sparql/QuantityValuePatternBuilder';
import { Condition } from '@/sparql/QueryRepresentation';
import StringValuePatternBuilder from '@/sparql/StringValuePatternBuilder';
import TripleBuilder from '@/sparql/TripleBuilder';
import ValuePatternBuilder from '@/sparql/ValuePatternBuilder';
import { Pattern } from 'sparqljs';

export default class PatternBuilder implements ValuePatternBuilder {
	private tripleBuilder: TripleBuilder;

	public constructor() {
		this.tripleBuilder = new TripleBuilder();
	}

	public buildValuePatternFromCondition(
		condition: Condition,
		conditionIndex: number,
		repeatingPropertyIndex: string,
		subjectVariableName: string,
	): Pattern[] {
		return this.getValuePatternBuilderForDatatype( condition.datatype )
			.buildValuePatternFromCondition( condition, conditionIndex, repeatingPropertyIndex, subjectVariableName );
	}

	private getValuePatternBuilderForDatatype( datatype: string ): ValuePatternBuilder {
		switch ( datatype ) {
			case 'string':
			case 'external-id':
			case 'url':
				return new StringValuePatternBuilder();
			case 'wikibase-item':
			case 'wikibase-lexeme':
			case 'wikibase-sense':
			case 'wikibase-form':
			case 'wikibase-property':
				return new EntityValueBuilder( datatype );
			case 'quantity':
				return new QuantityValuePatternBuilder();
			case 'time':
				return new DateValuePatternBuilder();
			case 'monolingualtext':
				return new MonolingualTextValuePatternBuilder();
			default:
				return new LimitedSupportPatternBuilder();
		}
	}

	public buildLabelServicePattern(): Pattern {
		return {
			type: 'bgp',
			triples: [ this.tripleBuilder.buildLabelServiceTriple() ],
		};
	}

	public buildAnyValuePattern(): Pattern {
		return {
			type: 'bgp',
			triples: [ this.tripleBuilder.buildAnyValueTripe() ],
		};
	}
}
