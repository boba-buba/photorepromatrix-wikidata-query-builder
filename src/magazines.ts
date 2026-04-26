import magazinesCsv from '../magazines.csv?raw';

export interface Magazine {
	label: string;
	country: string;
}

function parseCsv( csvText: string ): string[][] {
	const rows: string[][] = [];
	let currentRow: string[] = [];
	let currentValue = '';
	let insideQuotes = false;

	for ( let index = 0; index < csvText.length; index++ ) {
		const character = csvText[ index ];
		const nextCharacter = csvText[ index + 1 ];

		if ( insideQuotes ) {
			if ( character === '"' ) {
				if ( nextCharacter === '"' ) {
					currentValue += '"';
					index++;
				} else {
					insideQuotes = false;
				}
			} else {
				currentValue += character;
			}
			continue;
		}

		if ( character === '"' ) {
			insideQuotes = true;
			continue;
		}

		if ( character === ',' ) {
			currentRow.push( currentValue );
			currentValue = '';
			continue;
		}

		if ( character === '\n' ) {
			currentRow.push( currentValue );
			rows.push( currentRow );
			currentRow = [];
			currentValue = '';
			continue;
		}

		if ( character === '\r' ) {
			continue;
		}

		currentValue += character;
	}

	if ( currentValue.length || currentRow.length ) {
		currentRow.push( currentValue );
		rows.push( currentRow );
	}

	return rows;
}

function parseMagazines( csvText: string ): Magazine[] {
	const rows = parseCsv( csvText );
	const [ header, ...dataRows ] = rows;
	if ( !header ) {
		return [];
	}

	const labelIndex = header.indexOf( 'magazineLabel' );
	const countryIndex = header.indexOf( 'countryLabel' );
	if ( labelIndex === -1 || countryIndex === -1 ) {
		return [];
	}

	return dataRows
		.filter( ( row ) => row.length > Math.max( labelIndex, countryIndex ) )
		.map( ( row ) => ( {
			label: row[ labelIndex ],
			country: row[ countryIndex ],
		} ) )
		.sort( ( firstMagazine, secondMagazine ) => {
			const countryComparison = firstMagazine.country.localeCompare( secondMagazine.country, undefined, {
				sensitivity: 'base',
			} );
			if ( countryComparison !== 0 ) {
				return countryComparison;
			}

			const labelComparison = firstMagazine.label.localeCompare( secondMagazine.label, undefined, {
				sensitivity: 'base',
			} );
			if ( labelComparison !== 0 ) {
				return labelComparison;
			}

			return firstMagazine.country.localeCompare( secondMagazine.country, undefined, {
				sensitivity: 'base',
			} );
		} );
}

const magazines = parseMagazines( magazinesCsv );

export default magazines;
