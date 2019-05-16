import './src/auto-filler.scss';

const { apiFetch } = wp;
const { addQueryArgs } = wp.url;
const { Component, Fragment } = wp.element;
const { withInstanceId } = wp.compose;
const { __ } = wp.i18n;
const { Spinner, Popover, IconButton } = wp.components;
const { decodeEntities } = wp.htmlEntities;

function debounce( func, wait = 100 ) {
	let timeout;
	return function( ...args ) {
		clearTimeout( timeout );
		timeout = setTimeout( () => {
			func.apply( this, args );
		}, wait );
	};
}

const {
	PanelBody,
	RangeControl,
	ToggleControl
} = wp.components;

class AutoFiller extends Component {
	constructor() {
		super( ...arguments );

		this.state = {
			autofill: false,
			amount: 1,
			taxonomy: false,
			taxonomies: [],
			terms: [],
			loading: false,
			selectedTerms: [],
			openPopover: false,
			input: ''
		};

		this.enableAutofill = this.enableAutofill.bind( this );
		this.enableTaxonomies = this.enableTaxonomies.bind( this );
		this.searchTaxonomy = this.searchTaxonomy.bind( this );
		this.updateSearchResults = debounce( this.updateSearchResults.bind( this ), 500 );
		this.getSelectedTerms = this.getSelectedTerms.bind( this );
	}

	componentDidMount() {

		// If taxonomy is true, get selected Terms when componentdidmount
		if ( this.props.taxonomy ) {
			this.getSelectedTerms();
		}
	}

	/**
	* IMPORTANT
	* this.props refer to the properties on the <AutoFiller /> component in the GB block
	* So we are updating the local state in this component ( AutoFiller.js ) and the properties of this <AutoFiller /> component set in the GB block
	*/

	/**
	* Enable / disable the autofill property
	*/
	enableAutofill() {

		// Check autofill property (boolean)
		if ( ! this.props.autofill ) {
			this.setState({
				autofill: true
			}, () => {

				// After set in state, set autofill in GB block
				this.props.autofillState({
					autofill: true
				});

			});
		} else {

			// Also set taxonomy to false when autofill is
			this.setState({
				autofill: false,
				taxonomy: false
			}, () => {

				// After set in state, set autofill in GB block
				this.props.autofillState({
					autofill: false,
					taxonomy: false
				});
			});
		}
	}

	/**
	* Set amount of posts to auto fill
	* @param  {number}  amount  The amount of posts to autofill to
	*/
	setAmount( amount ) {
		this.setState({
			amount: amount
		}, () => {

			// After set in state, set amount in GB block
			this.props.setAmount( amount );
		});
	}

	/**
	* Enable / disable the taxonomy property
	*/
	enableTaxonomies() {

		// Check taxonomy property (boolean)
		if ( ! this.props.taxonomy ) {
			this.setState({
				taxonomy: true
			}, () => {

				// After set in state, set taxonomy state in block
				this.props.setTaxonomyState( true );

				// Run getSelectedTerms function to load the selected Terms
				this.getSelectedTerms();
			});
		} else {
			this.setState({
				taxonomies: [],
				terms: []
			}, () => {

				// After set in state, set taxonomy state in block
				this.props.setTaxonomyState( false );
			});
		}
	}

	/**
	* Function to get Taxonomies
	*/
	getTaxonomies() {
		return apiFetch({
			path: addQueryArgs( '/wp/v2/taxonomies', {
				per_page: -1 // eslint-disable-line camelcase
			})
		});
	}

	/**
	* Handle the onChange event on the search input
	* @param  {object}  event  The input event
	*/
	searchTaxonomy( event ) {

		// The user's input
		const inputValue = event.target.value;

		// Set input state to user's input
		this.setState({
			input: inputValue
		}, () => {

			// Run updateSearchResults with the user's input
			this.updateSearchResults( inputValue );
		});
	}

	/**
	* Function to update the search result based on user input
	* @param  {string}  inputValue   A string containing the search query
	*/
	updateSearchResults( inputValue ) {

		// Start when the user input is atleast 2 characters
		if ( 1 < inputValue.length ) {
			this.setState({
				loading: true
			}, () => {

				let fetchedItems = [];

				this.getTaxonomies().then( ( data ) => {

					// Delete yoasts prominent words taxonomy
					delete data.yst_prominent_words;
					let taxonomies = _.values( data );

					this.setState({
						taxonomies: taxonomies
					}, () => {
						this.state.taxonomies.map( ( taxonomy ) => {
							return apiFetch({
								path: addQueryArgs( `/wp/v2/${ taxonomy.rest_base }?search=${ inputValue }`, {
									per_page: -1 // eslint-disable-line camelcase
								})
							}).then( ( terms ) => {

								// Add the taxonomy restbase to the term object
								terms.map( ( term ) => {
									term.rest_base = taxonomy.rest_base; // eslint-disable-line camelcase
								});
								fetchedItems.push( terms );
								this.setState({
									terms: _.flatten( fetchedItems ),
									openPopover: true
								}, () => {
									this.setState({
										loading: false
									});
								});
							});
						});
					});
				});
			});
		}
	}

	/**
	* Function to add the selected Term
	* @param  {object}  newTerm    The new term object
	*/
	selectTerm( newTerm ) {

		const object = {
			taxonomy: newTerm.taxonomy,
			rest_base: newTerm.rest_base, // eslint-disable-line camelcase
			id: newTerm.id
		};

		const selectedTerms = this.props.terms;
		const term = selectedTerms.find( o => object.taxonomy === o.taxonomy );
		const existingTerm = selectedTerms.find( ({ taxonomy, id }) => object.taxonomy === taxonomy && id.includes( object.id ) );

		// If the taxonomy that is being added exists, only update the Ids Array
		// Else push the new taxonomy
		if ( term ) {

			// Check if term already exists in array
			if ( existingTerm ) {

				// Remove term
				term.id.splice( term.id.indexOf( object.id ), 1 );
			} else {

				// Add term
				term.id.push( object.id );
			}
		} else {

			// Push the new taxonomy in the array
			selectedTerms.push({
				...object,
				id: [ object.id ]
			});
		}

		// Set the state and in the callback pass the terms to the GB block
		this.props.setTerms([ ...selectedTerms ]);

		// Run getSelectedTerms function to set the selected term in the list under the search
		this.getSelectedTerms();

		// Empty input and close Popover
		this.setState({
			openPopover: false,
			input: ''
		});
	}

	/**
	* Function to get the selected terms to display in the list based on saved restbase and id.
	*/
	getSelectedTerms() {

		// Get taxonomies to
		this.getTaxonomies().then( ( data ) => {

			// Delete yoasts prominent words taxonomy
			delete data.yst_prominent_words;
			let taxonomies = _.values( data );

			this.setState({
				taxonomies: taxonomies
			});
		});


		// Emoty terms array
		let terms = [];

		// Empty selectedTerms in state
		this.setState({
			selectedTerms: []
		}, () => {
			this.setState({
				loading: false
			});
		});

		// Iterate the outer array with Array.flatMap() and the id array with Array.map()
		this.props.terms.flatMap( ({ rest_base, id }) => id.map( v => { // eslint-disable-line camelcase
			this.setState({
				loading: true
			});
			apiFetch({
				path: addQueryArgs( `/wp/v2/${rest_base}/${v}` ) // eslint-disable-line camelcase
			}).then( ( term ) => {

				// Push all term in objects in the terms array
				terms.push( term );

				// Set selectedTerms state with the new terms array
				this.setState({
					selectedTerms: terms
				}, () => {
					this.setState({
						loading: false
					});
				});
			});
		}) );
	}

	render() {
		return (
			<Fragment>
				<div className="auto-filler">
					<PanelBody title={ __( 'Autofiller', 'autofiller' ) }>

						<ToggleControl
							label={ __( 'Enable automatic filling', 'autofiller' ) }
							checked={ this.props.autofill }
							onChange={ () => this.enableAutofill() }
						/>

					</PanelBody>

					{ this.props.autofill ? (
						<PanelBody title=
							{
								1 == this.props.amount ? (
									__( `Fill with ${this.props.amount} item`, 'autofiller' )
								) : __( `Fill till ${this.props.amount} items`, 'autofiller' )
							}
						>
							<RangeControl
								value={ this.props.amount }
								onChange={ ( amount ) => this.setAmount( amount ) }
								min={ 1 }
								max={ this.props.limit }
								step={ 1 }
							/>

							<ToggleControl
								label={ __( 'Fill with items from Taxonomies', 'autofiller' ) }
								checked={ this.props.taxonomy }
								onChange={ () => this.enableTaxonomies() }
							/>

						</PanelBody>
					) : null }

					{ this.props.taxonomy && this.props.autofill ? (
						<PanelBody title={ __( 'Taxonomies', 'autofiller' ) }>

							<div className="auto-filler__group">
								<div className={ 'auto-fill-loader' + ` ${this.state.loading ? '' : 'auto-fill-loader--hide'} `}>
									<Spinner />
								</div>

								<input
									type="search"
									placeholder={ __( 'Search in Taxonomies', 'autofiller' ) }
									value={ this.state.input }
									onChange={ this.searchTaxonomy }
									aria-expanded={ this.state.openPopover }
									required
									className="auto-filler__input"
								/>

								{ this.state.openPopover && !! this.state.terms.length && (
									<Popover position="top" noArrow focusOnMount={ false }>
										<div className="autofill-suggestions">
											<div
												className="editor-url-input__suggestions"
												role="listbox">
												{ this.state.terms.map( ( term ) => {
													return (
														<button
															key={ term.id }
															role="option"
															onClick={ () => this.selectTerm( term ) }
															className="editor-url-input__suggestion"
														>
															<div className="suggested-item">
																<span className="suggested-item__title">
																	{ decodeEntities( term.name ) || __( 'No title', 'autofiller' ) }
																</span>
															</div>
														</button>
													);
												})}
											</div>
										</div>
									</Popover>
								)}

								{ this.state.selectedTerms.length ? (
									<div>
										{ this.state.taxonomies.map( ( taxonomy ) => {
											return (
												<div key={ taxonomy.id }>
													<div className="autofiller-title">{ taxonomy.name }</div>

													<ul className="autofiller-tags">
														{ this.state.selectedTerms.map( ( term ) => {
															if ( term.taxonomy == taxonomy.slug ) {
																return (
																	<li
																		className="autofiller-tags__item"
																		key={ term.id }
																	>
																		<div className="autofiller-tag">
																			<div className="autofiller-tag__name">{ term.name }</div>
																			<IconButton
																				onClick={ () => this.selectTerm( term ) } icon="dismiss"
																				className="autofiller-tag__icon" />
																		</div>
																	</li>
																);
															}
														})}
													</ul>
												</div>
											);
										}) }
									</div>
								) : null }
							</div>
						</PanelBody>
					) : null }

				</div>
			</Fragment>
		);
	}
}

export default withInstanceId( AutoFiller );
