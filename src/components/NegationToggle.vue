<template>
	<div class="negationToggle">
		<CdxToggleButtonGroup
			:model-value="modelValue"
			:buttons="buttons"
			@update:model-value="$emit( 'update:modelValue', $event )" />
	</div>
</template>

<script setup lang="ts">
import { CdxToggleButtonGroup } from '@wikimedia/codex';
import { useI18n } from 'vue-banana-i18n';

const messages = useI18n();

interface Props {
	modelValue?: string;
}

withDefaults( defineProps<Props>(), {
	modelValue: 'with',
} );

const buttons = [
	{ value: 'with', label: messages.i18n( 'query-builder-negation-option-label-with' ) },
	{ value: 'without', label: messages.i18n( 'query-builder-negation-option-label-without' ) },
];

defineEmits( [ 'update:modelValue' ] );
</script>
