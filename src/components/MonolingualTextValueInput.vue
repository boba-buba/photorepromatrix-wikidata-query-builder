<template>
	<div class="monolingual-text-value-input">
		<CdxField
			:status="error ? error.type : null"
			:messages="error ? { [error.type]: $i18n( error.message ) } : {}"
		>
			<template #label>
				{{ $i18n( 'query-builder-monolingualtext-text-label' ) }}
				<InfoTooltip
					position="end"
					:message="$i18n( 'query-builder-input-value-tooltip' )"
				/>
			</template>

			<CdxTextInput
				:model-value="textValue"
				input-type="text"
				:placeholder="$i18n( 'query-builder-monolingualtext-text-placeholder' )"
				:disabled="disabled"
				@update:model-value="onTextChange"
			/>
		</CdxField>

		<LanguageSelector
			v-if="isLanguageSelectorVisible"
			:disabled="disabled"
			auto-close-on-select
			@select="onLanguageSelect"
			@close="onLanguageSelectorClose"
		>
			<template #no-results>
				{{ $i18n( 'query-builder-monolingualtext-language-lookup-no-match-found' ) }}
			</template>
		</LanguageSelector>
		<div v-if="selectedLanguage" class="monolingual-text-value-input__selected-language">
			{{ $i18n( 'query-builder-monolingualtext-language-label' ) }}: <strong>{{ selectedLanguage.autonym }}</strong>
		</div>
	</div>
</template>

<script lang="ts">
import { CdxTextInput, CdxField } from '@wikimedia/codex';
import { defineComponent } from 'vue';
import { PropType } from 'vue';
import InfoTooltip from '@/components/InfoTooltip.vue';
import LanguageSelector from '@/components/LanguageSelector.vue';
import QueryBuilderError from '@/data-model/QueryBuilderError';
import Language from '@/data-model/Language';

export interface MonolingualTextValue {
	text: string;
	language: Language | null;
}

export default defineComponent( {
	name: 'MonolingualTextValueInput',
	components: {
		CdxTextInput,
		CdxField,
		LanguageSelector,
		InfoTooltip,
	},
	props: {
		modelValue: {
			type: Object as PropType<MonolingualTextValue | null>,
			default: null,
		},
		error: {
			type: Object as PropType<QueryBuilderError | null>,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	emits: [ 'update:modelValue' ],
	data() {
		return {
			textValue: this.modelValue?.text || '',
			selectedLanguage: this.modelValue?.language || null as Language | null,
			isLanguageSelectorVisible: !this.modelValue?.language,
		};
	},
	methods: {
		onTextChange( newText: string ): void {
			this.textValue = newText;
			this.emitUpdate();
		},
		onLanguageSelect( languageCode: string ): void {
			// Build language object with code and autonym
			// We'll fetch the autonym from the language data
			import( '@wikimedia/language-data' ).then( ( languageData ) => {
				const autonyms = languageData.default.getAutonyms();
				this.selectedLanguage = {
					code: languageCode,
					autonym: autonyms[ languageCode ] || languageCode,
				};
				this.isLanguageSelectorVisible = false;
				this.emitUpdate();
			} );
		},
		onLanguageSelectorClose(): void {
			this.isLanguageSelectorVisible = false;
		},
		emitUpdate(): void {
			this.$emit( 'update:modelValue', {
				text: this.textValue,
				language: this.selectedLanguage,
			} );
		},
	},
	watch: {
		disabled( isDisabled: boolean ): void {
			if ( isDisabled ) {
				this.textValue = '';
				this.selectedLanguage = null;
				this.isLanguageSelectorVisible = true;
			}
		},
		modelValue( newValue: MonolingualTextValue | null ): void {
			if ( newValue ) {
				this.textValue = newValue.text;
				this.selectedLanguage = newValue.language;
				this.isLanguageSelectorVisible = !newValue.language;
				return;
			}
			this.selectedLanguage = null;
			this.isLanguageSelectorVisible = true;
		},
	},
} );
</script>

<style lang="scss">
.monolingual-text-value-input {
	display: flex;
	flex-direction: column;
	gap: 1em;

	&__selected-language {
		font-size: 0.9em;
		color: #565656;
		padding: 0.5em 0;
	}
}
</style>
