export enum BasePropertyValueRelation {
	Matching = 'matching',
	NotMatching = 'without',
	Regardless = 'regardless-of-value',
}

export enum TextPropertyValueRelation {
	Contains = 'contains',
}

export enum RangePropertyValueRelation {
	LessThan = 'less-than',
	MoreThan = 'more-than',
}

const PropertyValueRelation = {
	...BasePropertyValueRelation,
	...TextPropertyValueRelation,
	...RangePropertyValueRelation,
};

type PropertyValueRelation =
	BasePropertyValueRelation |
	TextPropertyValueRelation |
	RangePropertyValueRelation;

export default PropertyValueRelation;
