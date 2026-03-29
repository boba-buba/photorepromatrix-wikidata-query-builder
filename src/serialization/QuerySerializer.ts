import RootState, {
	ConditionRow,
	ItemValue,
	LexemeValue,
	SenseValue,
	FormValue,
	QuantityValue,
	DateValue,
	PropertyValue,
} from '@/store/RootState';
import SerializedObject, { SerializedValue } from '@/data-model/SerializedObject';
import { MonolingualTextValue } from '@/form/MonolingualTextValidator';

export default class QuerySerializer {
	public serialize( state: RootState ): string {
		const conditions: SerializedObject[] = [];
		state.conditionRows.forEach( ( condition: ConditionRow ) => {
			const serializedCondition: SerializedObject = {
				propertyId: condition.propertyData.isPropertySet ? condition.propertyData.id : '',
				propertyDataType: condition.propertyData.datatype,
				propertyValueRelation: condition.propertyValueRelationData.value,
				referenceRelation: condition.referenceRelation,
				value: this.getValueFromCondition( condition ),
				subclasses: condition.subclasses,
				conditionRelation: condition.conditionRelation,
				negate: condition.negate,
			};
			if ( condition.sourceConditionId !== null ) {
				serializedCondition.sourceConditionId = condition.sourceConditionId;
			}
			conditions.push( serializedCondition );
		} );
		return JSON.stringify( {
			conditions,
			limit: state.limit,
			useLimit: state.useLimit,
			omitLabels: state.omitLabels,
		} );
	}

	private getValueFromCondition( condition: ConditionRow ): SerializedValue {
		if ( !condition.valueData.value ) {
			return ''; // maybe better return null?
		}
		if ( condition.propertyData.datatype === 'wikibase-item' ) {
			return ( condition.valueData.value as ItemValue ).id;
		}
		if ( condition.propertyData.datatype === 'wikibase-lexeme' ) {
			return ( condition.valueData.value as LexemeValue ).id;
		}
		if ( condition.propertyData.datatype === 'wikibase-sense' ) {
			return ( condition.valueData.value as SenseValue ).id;
		}
		if ( condition.propertyData.datatype === 'wikibase-form' ) {
			return ( condition.valueData.value as FormValue ).id;
		}
		if ( condition.propertyData.datatype === 'wikibase-property' ) {
			return ( condition.valueData.value as PropertyValue ).id;
		}
		if (condition.propertyData.datatype === 'monolingualtext') {
			const mlValue = condition.valueData.value as MonolingualTextValue;
			return {
				text: mlValue.text,
				language: mlValue.language?.code || null
			};
		}
		if ( condition.propertyData.datatype === 'quantity' ) {
			const quantityValue: QuantityValue = condition.valueData.value as QuantityValue;
			return {
				value: quantityValue.value,
				unit: quantityValue.unit ? quantityValue.unit.id : null,
			};
		}
		if ( condition.propertyData.datatype === 'time' ) {
			const dateValue: DateValue = condition.valueData.value as DateValue;

			if ( dateValue.parseResult ) {
				return {
					value: dateValue.parseResult.value.time,
					precision: dateValue.parseResult.value.precision,
				};
			}

			return '';
		}
		return condition.valueData.value as string;
	}
}
