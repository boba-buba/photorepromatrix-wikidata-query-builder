import QueryBuilderError from '@/data-model/QueryBuilderError';
import BaseValidator from '@/form/BaseValidator';

export interface MonolingualTextValue {
	text: string;
	language: { code: string; autonym: string } | null;
}

export default class MonolingualTextValidator {
	public validateValue( value: MonolingualTextValue | null ): null | QueryBuilderError {
		if ( !value ) {
			return BaseValidator.VALUE_MISSING_ERROR;
		}

		if ( !value.text || value.text.trim() === '' ) {
			return {
				type: 'error',
				message: 'query-builder-result-error-missing-value',
			};
		}

		if ( !value.language || !value.language.code ) {
			return {
				type: 'error',
				message: 'query-builder-monolingualtext-error-missing-language',
			};
		}

		return null;
	}
}
