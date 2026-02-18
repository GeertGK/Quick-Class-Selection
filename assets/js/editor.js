/**
 * Quick Class Selector - Gutenberg Editor Integration
 */
(function(wp) {
    'use strict';

    var createElement = wp.element.createElement;
    var Fragment = wp.element.Fragment;
    var InspectorAdvancedControls = wp.blockEditor.InspectorAdvancedControls;
    var createHigherOrderComponent = wp.compose.createHigherOrderComponent;
    var addFilter = wp.hooks.addFilter;
    var useState = wp.element.useState;
    var useEffect = wp.element.useEffect;

    // Get predefined classes from localized script
    var predefinedClasses = (typeof qcsSettings !== 'undefined' && qcsSettings.classes) ? qcsSettings.classes : [];

    // Skip if no classes defined
    if (!predefinedClasses.length) {
        return;
    }

    // Detect hex color in a string and return the first match or null
    var hexColorRegex = /#([0-9a-fA-F]{3,6})\b/;

    function getHexColor(text) {
        if (!text) return null;
        var match = text.match(hexColorRegex);
        return match ? match[0] : null;
    }

    /**
     * Multi Select Dropdown Component
     */
    function QuickClassSelector(props) {
        var className = props.className || '';
        var setAttributes = props.setAttributes;

        var _useState = useState(false),
            isOpen = _useState[0],
            setIsOpen = _useState[1];

        var _useSearchState = useState(''),
            searchTerm = _useSearchState[0],
            setSearchTerm = _useSearchState[1];

        // Filter classes based on search term
        var filteredClasses = predefinedClasses.filter(function(item) {
            if (!searchTerm) return true;
            var term = searchTerm.toLowerCase();
            return item.class.toLowerCase().indexOf(term) !== -1 ||
                   (item.description && item.description.toLowerCase().indexOf(term) !== -1);
        });

        // Parse current classes
        var currentClasses = className ? className.split(' ').filter(Boolean) : [];

        // Determine which quick classes are selected
        var selectedQuickClasses = predefinedClasses.filter(function(item) {
            return currentClasses.includes(item.class);
        }).map(function(item) {
            return item.class;
        });

        // Toggle a class
        function toggleClass(classToToggle) {
            var newClasses = currentClasses.slice();

            if (newClasses.includes(classToToggle)) {
                // Remove class
                newClasses = newClasses.filter(function(c) {
                    return c !== classToToggle;
                });
            } else {
                // Add class
                newClasses.push(classToToggle);
            }

            setAttributes({ className: newClasses.join(' ') });
        }

        // Clear all quick classes
        function clearAll() {
            var nonQuickClasses = currentClasses.filter(function(c) {
                return !predefinedClasses.some(function(item) {
                    return item.class === c;
                });
            });
            setAttributes({ className: nonQuickClasses.join(' ') });
        }

        // Close dropdown when clicking outside
        useEffect(function() {
            function handleClickOutside(event) {
                if (isOpen && !event.target.closest('.qcs-dropdown')) {
                    setIsOpen(false);
                    setSearchTerm('');
                }
            }
            document.addEventListener('mousedown', handleClickOutside);
            return function() {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [isOpen]);

        return createElement(
            'div',
            { className: 'qcs-dropdown' },
            createElement(
                'label',
                { className: 'qcs-label' },
                'Quick Classes'
            ),
            createElement(
                'div',
                {
                    className: 'qcs-dropdown-trigger' + (isOpen ? ' is-open' : ''),
                    onClick: function() { setIsOpen(!isOpen); }
                },
                createElement(
                    'span',
                    { className: 'qcs-dropdown-text' },
                    selectedQuickClasses.length
                        ? selectedQuickClasses.length + ' class' + (selectedQuickClasses.length > 1 ? 'es' : '') + ' geselecteerd'
                        : 'Selecteer classes...'
                ),
                createElement(
                    'span',
                    { className: 'qcs-dropdown-arrow' },
                    createElement('svg', {
                        viewBox: '0 0 24 24',
                        width: '18',
                        height: '18',
                        fill: 'currentColor'
                    }, createElement('path', {
                        d: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z'
                    }))
                )
            ),
            isOpen && createElement(
                'div',
                { className: 'qcs-dropdown-menu' },
                createElement(
                    'div',
                    { className: 'qcs-search-wrap' },
                    createElement('input', {
                        type: 'text',
                        className: 'qcs-search-input',
                        placeholder: 'Zoek classes...',
                        value: searchTerm,
                        onChange: function(e) { setSearchTerm(e.target.value); },
                        onClick: function(e) { e.stopPropagation(); }
                    })
                ),
                selectedQuickClasses.length > 0 && createElement(
                    'button',
                    {
                        type: 'button',
                        className: 'qcs-clear-btn',
                        onClick: function(e) {
                            e.stopPropagation();
                            clearAll();
                        }
                    },
                    'Alles wissen'
                ),
                filteredClasses.length === 0 && createElement(
                    'div',
                    { className: 'qcs-no-results' },
                    'Geen classes gevonden'
                ),
                filteredClasses.map(function(item) {
                    var isSelected = selectedQuickClasses.includes(item.class);
                    return createElement(
                        'label',
                        {
                            key: item.class,
                            className: 'qcs-option' + (isSelected ? ' is-selected' : '')
                        },
                        createElement('input', {
                            type: 'checkbox',
                            checked: isSelected,
                            onChange: function() { toggleClass(item.class); }
                        }),
                        createElement(
                            'span',
                            { className: 'qcs-option-content' },
                            createElement(
                                'span',
                                { className: 'qcs-option-class' },
                                '.' + item.class
                            ),
                            item.description && createElement(
                                'span',
                                { className: 'qcs-option-description' },
                                item.description,
                                getHexColor(item.description) && createElement('span', {
                                    className: 'qcs-color-swatch',
                                    style: { backgroundColor: getHexColor(item.description) }
                                })
                            )
                        ),
                        createElement(
                            'span',
                            { className: 'qcs-option-check' },
                            isSelected && createElement('svg', {
                                viewBox: '0 0 24 24',
                                width: '18',
                                height: '18',
                                fill: 'currentColor'
                            }, createElement('path', {
                                d: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'
                            }))
                        )
                    );
                })
            ),
            selectedQuickClasses.length > 0 && createElement(
                'div',
                { className: 'qcs-selected-tags' },
                selectedQuickClasses.map(function(cls) {
                    return createElement(
                        'span',
                        {
                            key: cls,
                            className: 'qcs-tag'
                        },
                        '.' + cls,
                        createElement(
                            'button',
                            {
                                type: 'button',
                                className: 'qcs-tag-remove',
                                onClick: function() { toggleClass(cls); }
                            },
                            '\u00D7'
                        )
                    );
                })
            )
        );
    }

    /**
     * Higher Order Component to add Quick Class Selector to Inspector Advanced Controls
     */
    var withQuickClassSelector = createHigherOrderComponent(function(BlockEdit) {
        return function(props) {
            return createElement(
                Fragment,
                null,
                createElement(BlockEdit, props),
                createElement(
                    InspectorAdvancedControls,
                    null,
                    createElement(QuickClassSelector, {
                        className: props.attributes.className,
                        setAttributes: props.setAttributes
                    })
                )
            );
        };
    }, 'withQuickClassSelector');

    addFilter(
        'editor.BlockEdit',
        'quick-class-selector/with-quick-class-selector',
        withQuickClassSelector
    );

})(window.wp);
