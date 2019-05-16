![npm](https://img.shields.io/npm/v/@kevinio/gutenberg-autofill.svg?style=flat-square)

# Gutenberg AutoFiller Component

The AutoFiller component is a Gutenberg React component.
A user can set a number of items to automatically fill a Gutenberg block. Optionally, the user can select one or multiple Taxonomies to fill content from. It's the perfect block to easily show different types of content.

Example output:

`
{
	"autofill": true,
	"amount": 10,
	"useTaxonomy": true,
	"terms":[
		{
			"taxonomy": "category",
			"rest_base": "categories",
			"id":[ 102, 56 ]
		},
		{
			"taxonomy": "post_tag",
			"rest_base": "tags",
			"id": [ 97, 99 ]
		}
	]}
}
`

## Installation

`npm install @kevinio/gutenberg-autofill --save`

### Usage

block.js

```javascript
import AutoFiller from '@kevinio/gutenberg-autofill';

const { __ } = wp.i18n;
const { registerBlockType } = wp.blocks;
const { Component } = wp.element;

const {
	InspectorControls
} = wp.editor;

registerBlockType( 'kevinio/auto-filler', {
	title: __( 'Autofiller' ),
	icon: 'universal-access-alt',
	category: 'common',
	keywords: [
		__( 'autofiller' ),
		__( 'auto' ),
		__( 'kevinio' )
	],
	attributes: {
		autofill: {
			type: 'boolean',
			default: false
		},
		amount: {
			type: 'number',
			default: 1
		},
		useTaxonomy: {
			type: 'boolean',
			default: false
		},
		terms: {
			type: 'array',
			default: []
		}
	},
	edit: class extends Component {
		constructor( props ) {
			super( ...arguments );
			this.props = props;
		}

		render() {
			const {
				attributes: {
					autofill,
					amount,
					terms,
					useTaxonomy
				},
				setAttributes
			} = this.props;

			return (
				<div>
					<InspectorControls>
						<AutoFiller
							limit='20'
							autofill={ autofill }
							autofillState={ state => {
								if ( ! state.taxonomy ) {
									setAttributes({
										autofill: state.autofill
									});
								} else {
									setAttributes({
										autofill: state.autofill,
										useTaxonomy: state.taxonomy
									});
								}
							}}
							amount={ amount }
							setAmount={ number => {
								setAttributes({
									amount: number
								});
							}}
							taxonomy={ useTaxonomy }
							setTaxonomyState={ state => {
								setAttributes({
									useTaxonomy: state
								});
							}}
							terms={ terms }
							setTerms={ terms => {
								setAttributes({
									terms: terms
								});
							}}
						/>
					</InspectorControls>
					<div className="output">
						<h2>Autofiller</h2>
						{ autofill && 0 < amount ? (
							<div>
								{ 1 == amount ? (
									__( `This block is being filled with ${ amount } item` )
								) :
									__( `This block is being filled with ${ amount } items` )
								}
							</div>
						) : null }
					</div>
				</div>
			);
		}
	},
	save() {
		return null;
	}
});
```

### Props

`autofill`: (boolean): Enable/disable autofilling

`autofillState`: (function) Sets the autofill attribute in the block

`amount`: (number): Sets the number of items in the block

`setAmount`: (function) Sets the selected number of items in the attribute of the block

`limit`: (number): Limit the amount of items a user is allowed to select

`taxonomy`: (boolean): Enable/disable autofilling from one or multiple taxonomies.

`setTaxonomyState`: (function) Sets the taxonomy attribute in the block

`terms`: (array): The selected term objects

`setTerms`: (function) Sets the array of terms in the attribute